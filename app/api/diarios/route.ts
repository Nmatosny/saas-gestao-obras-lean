import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

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

    const body = await request.json();
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

    const result = await prisma.$transaction(async (tx) => {
      const diario = await tx.diario.create({
        data: {
          date: new Date(date),
          weatherMorning,
          weatherAfternoon,
          weatherNight,
          notes,
          ocorrencias,
          equipamentos,
          obraId,
        }
      });

      const efetivoMap = new Map();
      if (efetivos && Array.isArray(efetivos)) {
        for (let i = 0; i < efetivos.length; i++) {
          const ef = efetivos[i];
          const createdEfetivo = await tx.efetivo.create({
            data: {
              role: ef.role,
              count: Number(ef.count),
              diarioId: diario.id
            }
          });
          efetivoMap.set(i, createdEfetivo.id);
        }
      }

      if (atividades && Array.isArray(atividades)) {
        for (const act of atividades) {
          // Busca dados atuais da atividade para cálculo acumulado
          const currentAtiv = await tx.atividade.findUnique({
            where: { id: act.atividadeId },
            select: { progress: true, quantidadeTotal: true }
          });

          if (!currentAtiv) continue;

          const qtyToday = Number(act.quantidadeRealizada) || 0;
          const totalQty = currentAtiv.quantidadeTotal || 100;
          
          // Se informou quantidade, calcula o progresso acumulado
          // Caso contrário, usa o progresso informado (fallback legado)
          let newProgress = Number(act.progress);
          if (qtyToday > 0) {
            const currentProgressQty = (currentAtiv.progress / 100) * totalQty;
            newProgress = Math.min(100, ((currentProgressQty + qtyToday) / totalQty) * 100);
          }

          const diarioAtividade = await tx.diarioAtividade.create({
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

          await tx.atividade.update({
            where: { id: act.atividadeId },
            data: { 
              progress: newProgress,
              status: newProgress >= 100 ? 'concluido' : 'em_andamento'
            }
          });

          if (act.efetivoIndices && Array.isArray(act.efetivoIndices)) {
            for (const index of act.efetivoIndices) {
              const efetivoId = efetivoMap.get(index);
              if (efetivoId) {
                await tx.apontamento.create({
                  data: {
                    efetivoId,
                    diarioAtividadeId: diarioAtividade.id
                  }
                });
              }
            }
          }
        }
      }

      if (fotos && Array.isArray(fotos)) {
        for (const foto of fotos) {
          await tx.foto.create({
            data: {
              url: foto.url,
              caption: foto.caption,
              diarioId: diario.id
            }
          });
        }
      }

      return diario;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar diário completo' }, { status: 500 });
  }
}
