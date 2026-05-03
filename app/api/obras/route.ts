import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProjectCore } from '@/lib/domain/ProjectCore';
import { getWorkspaceSession, unauthorizedResponse } from '@/lib/auth';
import { obraSchema } from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const obras = await prisma.obra.findMany({
      where: { workspaceId },
      include: {
        atividades: {
          select: {
            progress: true,
            weight: true,
            startDate: true,
            endDate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const obrasComStats = obras.map(obra => {
      const { atividades, ...rest } = obra;
      
      const eva = ProjectCore.calculateEVA(atividades as any);
      const totalWeight = eva.totalWeight || 1;
      const avgReal = (eva.earnedValue * 100) / totalWeight;
      const avgPlanned = (eva.plannedValue * 100) / totalWeight;

      return {
        ...rest,
        stats: {
          progresso: Math.round(avgReal),
          progressoPlanejado: Math.round(avgPlanned),
          desvio: Number((avgReal - avgPlanned).toFixed(1)),
          totalAtividades: atividades.length,
          spi: eva.spi
        }
      };
    });

    return NextResponse.json(obrasComStats);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar obras' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const body = await request.json();
    
    // VALIDATION (ZOD)
    const validation = obraSchema.safeParse({
      nome: body.nome || body.name,
      descricao: body.descricao || body.description,
      endereco: body.endereco,
      engenheiro: body.engenheiro,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 });
    }

    const { nome, descricao, endereco, engenheiro } = validation.data;

    const obra = await prisma.obra.create({
      data: {
        nome,
        descricao,
        endereco,
        engenheiro,
        workspaceId,
      },
    });

    return NextResponse.json(obra, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar obra:', error);
    return NextResponse.json({ error: 'Erro ao criar obra' }, { status: 500 });
  }
}
