import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
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

    const today = new Date();
    const obrasComStats = obras.map(obra => {
      const { atividades, ...rest } = obra;
      
      let totalWeight = 0;
      let weightedReal = 0;
      let weightedPlanned = 0;

      atividades.forEach(a => {
        const weight = a.weight || 1;
        totalWeight += weight;
        
        weightedReal += (a.progress * weight);
        
        const planned = MetricsEngine.calculatePlannedProgress(
          new Date(a.startDate), 
          new Date(a.endDate), 
          today
        );
        weightedPlanned += (planned * weight);
      });

      const avgReal = totalWeight > 0 ? weightedReal / totalWeight : 0;
      const avgPlanned = totalWeight > 0 ? weightedPlanned / totalWeight : 0;
      
      return {
        ...rest,
        stats: {
          progresso: Math.round(avgReal),
          progressoPlanejado: Math.round(avgPlanned),
          desvio: Number((avgReal - avgPlanned).toFixed(1)),
          totalAtividades: atividades.length,
          status: MetricsEngine.determineStatus(avgReal, avgPlanned)
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
