import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';
import { diarioSchema } from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    // TENANT GUARD
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const diarios = await prisma.diario.findMany({
      where: { obraId },
      include: {
        atividades: {
          include: {
            atividade: {
              include: { location: true, service: true }
            },
            apontamentos: {
              include: { efetivo: true }
            }
          }
        },
        efetivos: true,
        fotos: true,
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(diarios);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar diários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const json = await request.json();
    const body = diarioSchema.parse(json);
    const { 
      date, 
      weatherMorning, weatherAfternoon, weatherNight, 
      notes, obraId, efetivos, atividades,
      ocorrencias, equipamentos, fotos
    } = body;

    if (!date || !obraId) {
      return NextResponse.json({ error: 'Data e obraId são obrigatórios' }, { status: 400 });
    }

    // 1. TENANT GUARD & Duplicidade
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const existente = await prisma.diario.findFirst({
      where: { obraId, date: new Date(date) }
    });
    if (existente) {
      return NextResponse.json({ error: 'Já existe um RDO para esta data' }, { status: 409 });
    }

    // 2. Pre-fetch inicial fora da transação
    const user = await prisma.user.findFirst({ where: { workspaceId } });
    const userId = user?.id || '';

    const atividadeIds = (atividades || []).map(a => a.atividadeId);
    const currentAtividades = await prisma.atividade.findMany({
      where: { id: { in: atividadeIds } }
    });
    const currentAtivMap = new Map(currentAtividades.map(a => [a.id, a]));

    // 3. Iniciar Transação Otimizada
    const result = await prisma.$transaction(async (tx) => {
      const diario = await tx.diario.create({
        data: {
          date: new Date(date),
          weatherMorning, weatherAfternoon, weatherNight,
          notes, ocorrencias, equipamentos, obraId,
        }
      });

      // Efetivos em paralelo
      const efetivoMap = new Map<number, string>();
      if (efetivos && Array.isArray(efetivos)) {
        const createdEfetivos = await Promise.all(
          efetivos.map((ef, i) => tx.efetivo.create({
            data: { role: ef.role, count: Number(ef.count), diarioId: diario.id }
          }).then(r => ({ i, id: r.id })))
        );
        createdEfetivos.forEach(({ i, id }) => efetivoMap.set(i, id));
      }

      const auditData: any[] = [];
      const apontamentoData: any[] = [];
      
      // Criar DiarioAtividades e atualizar Atividades Mestre em paralelo
      if (atividades && Array.isArray(atividades)) {
        const activityPromises = atividades.map(async (act) => {
          const current = currentAtivMap.get(act.atividadeId);
          if (!current) return null;

          const qtyToday = Number(act.quantidadeRealizada) || 0;
          const totalQty = current.quantidadeTotal || 100;
          
          let calcProgress: number;
          if (qtyToday > 0) {
            const currentQty = (current.progress / 100) * totalQty;
            calcProgress = Math.min(100, ((currentQty + qtyToday) / totalQty) * 100);
          } else {
            calcProgress = Number(act.progress) || 0;
          }
          const newProgress = Math.max(calcProgress, current.progress);

          // Preparar auditoria
          if (newProgress > current.progress || qtyToday > 0) {
            auditData.push({
              atividadeId: act.atividadeId,
              obraId, userId,
              oldProgress: current.progress,
              newProgress,
              oldQuantity: current.quantidadeRealizada || 0,
              newQuantity: (current.quantidadeRealizada || 0) + qtyToday,
              source: "RDO"
            });
          }

          // Criar registro da atividade no Diário
          const createdDA = await tx.diarioAtividade.create({
            data: {
              diarioId: diario.id,
              atividadeId: act.atividadeId,
              progress: newProgress,
              quantidadeRealizada: qtyToday,
              status: act.status,
              quantidadeTrabalhadores: Number(act.quantidadeTrabalhadores) || 0,
              fotosAtividade: act.fotosAtividade ? JSON.stringify(act.fotosAtividade) : null,
            }
          });

          // Atualizar Atividade Mestra
          if (newProgress > current.progress || act.status) {
            await tx.atividade.update({
              where: { id: act.atividadeId },
              data: {
                progress: newProgress,
                status: newProgress >= 100 ? 'concluido' : 'em_andamento',
              }
            });
          }

          // Vincular apontamentos (mão de obra)
          if (act.efetivoIndices && Array.isArray(act.efetivoIndices)) {
            act.efetivoIndices.forEach(idx => {
              const efId = efetivoMap.get(idx);
              if (efId) apontamentoData.push({ efetivoId: efId, diarioAtividadeId: createdDA.id });
            });
          }
          
          return createdDA;
        });

        await Promise.all(activityPromises);
      }

      // Final batch writes
      const finalTasks = [];
      if (auditData.length > 0) finalTasks.push(tx.measurementAudit.createMany({ data: auditData }));
      if (apontamentoData.length > 0) finalTasks.push(tx.apontamento.createMany({ data: apontamentoData }));
      if (fotos && Array.isArray(fotos)) {
        finalTasks.push(tx.foto.createMany({
          data: fotos.map(f => ({ url: f.url, caption: f.caption, diarioId: diario.id }))
        }));
      }

      if (finalTasks.length > 0) await Promise.all(finalTasks);

      return diario;
    }, {
      maxWait: 5000,
      timeout: 15000 // Limite de segurança para não prender o banco se a Vercel matar o processo
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro RDO:', error);
    return NextResponse.json({ error: 'Erro ao processar medição' }, { status: 500 });
  }
}

