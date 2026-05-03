import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId é obrigatório' }, { status: 400 });
    }

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
      let realProgress = 0;
      let plannedProgress = 0;

      atividades.forEach(a => {
        const weight = a.weight || 0;
        totalWeight += weight;
        
        // Real
        realProgress += (a.progress * weight);

        // Planejado (Baseline)
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        const duration = end.getTime() - start.getTime();
        const elapsed = today.getTime() - start.getTime();
        let planned = 0;
        if (duration > 0) {
          planned = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        }
        plannedProgress += (planned * weight);
      });

      const avgReal = totalWeight > 0 ? realProgress / totalWeight : 0;
      const avgPlanned = totalWeight > 0 ? plannedProgress / totalWeight : 0;
      const desvio = avgReal - avgPlanned;

      let status = 'Saudável';
      if (desvio < -10) status = 'Crítico';
      else if (desvio < -5) status = 'Atenção';
      else if (avgReal > 99) status = 'Concluída';

      return {
        ...rest,
        stats: {
          progresso: Math.round(avgReal),
          progressoPlanejado: Math.round(avgPlanned),
          desvio: Number(desvio.toFixed(1)),
          totalAtividades: atividades.length,
          status
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
    const body = await request.json();
    const { name, description, workspaceId } = body;

    // Aceita tanto name/description (vindo do front antigo) quanto nome/descricao
    const finalName = name || body.nome;
    const finalDesc = description || body.descricao;

    if (!finalName || !workspaceId) {
      return NextResponse.json({ error: 'Nome e workspaceId são obrigatórios' }, { status: 400 });
    }

    // Garante que o workspace existe (necessário após reset do banco)
    await prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: 'Meu Workspace' }
    });

    const obra = await prisma.obra.create({
      data: {
        nome: finalName,
        descricao: finalDesc,
        workspaceId,
      },
    });

    return NextResponse.json(obra, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar obra:', error);
    return NextResponse.json({ error: 'Erro ao criar obra' }, { status: 500 });
  }
}
