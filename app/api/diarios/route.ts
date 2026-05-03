import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

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

      // 2. Cria os Efetivos e mapeia para uso posterior
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

      // 3. Cria as Atividades do Diário e os Apontamentos de Efetivo
      if (atividades && Array.isArray(atividades)) {
        for (const act of atividades) {
          const diarioAtividade = await tx.diarioAtividade.create({
            data: {
              diarioId: diario.id,
              atividadeId: act.atividadeId,
              progress: Number(act.progress),
              status: act.status,
              quantidadeTrabalhadores: Number(act.quantidadeTrabalhadores) || 0,
              fotosAtividade: act.fotosAtividade ? JSON.stringify(act.fotosAtividade) : null,
            }
          });

          // Atualiza o progresso global da atividade
          // Nota: Em um sistema real, aqui somaríamos o progresso ou calcularíamos o total.
          // Para o MVP, vamos assumir que o progresso enviado é o acumulado ou o mestre está informando o total.
          await tx.atividade.update({
            where: { id: act.atividadeId },
            data: { 
              progress: Number(act.progress),
              // Se bater 100%, move o status do Kanban automaticamente
              status: Number(act.progress) >= 100 ? 'concluido' : 'em_andamento'
            }
          });

          // Linka com o Efetivo (Apontamento)
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

      // 4. Cria as Fotos (Evidências)
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
