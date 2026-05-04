import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';
import { diarioSchema } from '@/lib/validations';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const diarios = await prisma.diario.findMany({
      where: { obraId },
      include: {
        atividades: {
          include: {
            atividade: { include: { location: true, service: true } },
            apontamentos: { include: { efetivo: true } }
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

    // 1. Bloqueio de duplicidade e Permissão
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const existente = await prisma.diario.findFirst({
      where: { obraId, date: new Date(date) }
    });
    if (existente) {
      return NextResponse.json({ error: 'Já existe um RDO para esta data' }, { status: 409 });
    }

    // 2. Preparação de Dados em Memória (Zero latência)
    const user = await prisma.user.findFirst({ where: { workspaceId } });
    const userId = user?.id || '';

    const atividadeIds = (atividades || []).map(a => a.atividadeId);
    const currentAtividades = await prisma.atividade.findMany({
      where: { id: { in: atividadeIds } }
    });
    const currentAtivMap = new Map(currentAtividades.map(a => [a.id, a]));

    // Gerar IDs antecipadamente para vinculação manual
    const diarioId = randomUUID();
    
    // Preparar Efetivos
    const efetivoRecords = (efetivos || []).map((ef, idx) => ({
      id: randomUUID(),
      role: ef.role,
      count: Number(ef.count),
      diarioId,
      tempIdx: idx // para vincular aos apontamentos
    }));
    const efetivoIdxMap = new Map(efetivoRecords.map(r => [r.tempIdx, r.id]));

    const diarioAtividadeRecords: any[] = [];
    const apontamentoRecords: any[] = [];
    const auditRecords: any[] = [];
    const updateAtividadePromises: any[] = [];

    if (atividades && Array.isArray(atividades)) {
      for (const act of atividades) {
        const current = currentAtivMap.get(act.atividadeId);
        if (!current) continue;

        const daId = randomUUID();
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

        // Registro da atividade no RDO
        diarioAtividadeRecords.push({
          id: daId,
          diarioId,
          atividadeId: act.atividadeId,
          progress: newProgress,
          quantidadeRealizada: qtyToday,
          status: act.status,
          quantidadeTrabalhadores: Number(act.quantidadeTrabalhadores) || 0,
          fotosAtividade: act.fotosAtividade ? JSON.stringify(act.fotosAtividade) : null,
        });

        // Auditoria
        if (newProgress > current.progress || qtyToday > 0) {
          auditRecords.push({
            id: randomUUID(),
            atividadeId: act.atividadeId,
            obraId, userId,
            oldProgress: current.progress,
            newProgress,
            oldQuantity: current.quantidadeRealizada || 0,
            newQuantity: (current.quantidadeRealizada || 0) + qtyToday,
            source: "RDO"
          });
        }

        // Apontamentos de Mão de Obra
        if (act.efetivoIndices && Array.isArray(act.efetivoIndices)) {
          act.efetivoIndices.forEach(idx => {
            const efId = efetivoIdxMap.get(idx);
            if (efId) {
              apontamentoRecords.push({
                id: randomUUID(),
                efetivoId: efId,
                diarioAtividadeId: daId
              });
            }
          });
        }
      }
    }

    // 3. Execução Atômica em Massa
    const result = await prisma.$transaction(async (tx) => {
      // Cria Diário
      const diario = await tx.diario.create({
        data: {
          id: diarioId,
          date: new Date(date),
          weatherMorning, weatherAfternoon, weatherNight,
          notes, ocorrencias, equipamentos, obraId,
        }
      });

      // Salva tudo em blocos (createMany é extremamente rápido)
      if (efetivoRecords.length > 0) {
        await tx.efetivo.createMany({ 
          data: efetivoRecords.map(({ tempIdx, ...r }) => r) 
        });
      }
      if (diarioAtividadeRecords.length > 0) {
        await tx.diarioAtividade.createMany({ data: diarioAtividadeRecords });
      }
      if (apontamentoRecords.length > 0) {
        await tx.apontamento.createMany({ data: apontamentoRecords });
      }
      if (auditRecords.length > 0) {
        await tx.measurementAudit.createMany({ data: auditRecords });
      }
      if (fotos && Array.isArray(fotos)) {
        await tx.foto.createMany({
          data: fotos.map(f => ({ 
            id: randomUUID(),
            url: f.url, 
            caption: f.caption, 
            diarioId 
          }))
        });
      }

      // 4. Atualizar Atividades Mestre (Infelizmente precisa ser individual, mas faremos no fim)
      const updatePromises = diarioAtividadeRecords.map(da => 
        tx.atividade.update({
          where: { id: da.atividadeId },
          data: {
            progress: da.progress,
            status: da.progress >= 100 ? 'concluido' : 'em_andamento',
            quantidadeRealizada: { increment: da.quantidadeRealizada }
          }
        })
      );
      
      await Promise.all(updatePromises);

      return diario;
    }, {
      maxWait: 5000,
      timeout: 20000 
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro RDO Crítico:', error);
    return NextResponse.json({ error: 'Falha crítica ao salvar medição. Verifique os dados e tente novamente.' }, { status: 500 });
  }
}

