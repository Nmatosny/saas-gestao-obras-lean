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
      weatherMorning, 
      weatherAfternoon, 
      weatherNight, 
      notes, 
      obraId, 
      efetivos, 
      atividades,
      ocorrencias,
      equipamentos,
      fotos
    } = body;

    if (!date || !obraId) {
      return NextResponse.json({ error: 'Data e obraId são obrigatórios' }, { status: 400 });
    }

    // TENANT GUARD
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const existente = await prisma.diario.findFirst({
      where: { obraId, date: new Date(date) }
    });
    if (existente) {
      return NextResponse.json({ error: 'Já existe um RDO para esta data' }, { status: 409 });
    }

    // 1. Resolver userId antes da transaction
    const user = await prisma.user.findFirst({ where: { workspaceId } });
    const userId = user?.id || '';

    // 2. Pre-carregar estados das atividades
    const atividadeIds = (atividades || []).map(a => a.atividadeId);
    const currentAtividades = await prisma.atividade.findMany({
      where: { id: { in: atividadeIds } }
    });
    const currentAtivMap = new Map(currentAtividades.map(a => [a.id, a]));

    const result = await prisma.$transaction(async (tx) => {
      // 3. Criar Diário
      const diario = await tx.diario.create({
        data: {
          date: new Date(date),
          weatherMorning, weatherAfternoon, weatherNight,
          notes, ocorrencias, equipamentos, obraId,
        }
      });

      // 4. Efetivos em paralelo
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

      // 5. Processar Atividades
      if (atividades && Array.isArray(atividades)) {
        for (const act of atividades) {
          const current = currentAtivMap.get(act.atividadeId);
          if (!current) continue;

          const qtyToday = Number(act.quantidadeRealizada) || 0;
          const totalQty = current.quantidadeTotal || 100;

          let calculatedProgress: number;
          if (qtyToday > 0) {
            const currentQty = (current.progress / 100) * totalQty;
            calculatedProgress = Math.min(100, ((currentQty + qtyToday) / totalQty) * 100);
          } else {
            calculatedProgress = Number(act.progress) || 0;
          }

          const newProgress = Math.max(calculatedProgress, current.progress);

          if (newProgress > current.progress || qtyToday > 0) {
            auditData.push({
              atividadeId: act.atividadeId,
              obraId,
              userId,
              oldProgress: current.progress,
              newProgress,
              oldQuantity: current.quantidadeRealizada || 0,
              newQuantity: (current.quantidadeRealizada || 0) + qtyToday,
              source: "RDO"
            });
          }

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

          if (newProgress > current.progress || act.status) {
            await tx.atividade.update({
              where: { id: act.atividadeId },
              data: {
                progress: newProgress,
                status: newProgress >= 100 ? 'concluido' : 'em_andamento',
              }
            });
          }

          if (act.efetivoIndices && Array.isArray(act.efetivoIndices)) {
            for (const idx of act.efetivoIndices) {
              const efId = efetivoMap.get(idx);
              if (efId) {
                apontamentoData.push({ efetivoId: efId, diarioAtividadeId: createdDA.id });
              }
            }
          }
        }
      }

      // 6. Batched Final Writes
      if (auditData.length > 0) await tx.measurementAudit.createMany({ data: auditData });
      if (apontamentoData.length > 0) await tx.apontamento.createMany({ data: apontamentoData });
      if (fotos && Array.isArray(fotos)) {
        await tx.foto.createMany({
          data: fotos.map(f => ({ url: f.url, caption: f.caption, diarioId: diario.id }))
        });
      }

      return diario;
    }, { maxWait: 5000, timeout: 30000 });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar diário completo' }, { status: 500 });
  }
}
