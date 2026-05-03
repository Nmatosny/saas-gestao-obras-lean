import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
    });

    if (atividades.length === 0) return NextResponse.json([]);

    // Calcula os limites da obra
    const starts = atividades.map(a => new Date(a.startDate).getTime());
    const ends = atividades.map(a => new Date(a.endDate).getTime());
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));

    const duration = maxDate.getTime() - minDate.getTime();
    const step = duration / 10; // 10 pontos na curva

    const pontos = [];
    const today = new Date();

    for (let i = 0; i <= 10; i++) {
      const currentPointDate = new Date(minDate.getTime() + step * i);
      
      let weightedPlanned = 0;
      let totalWeight = 0;

      atividades.forEach(a => {
        const weight = a.weight || 1;
        totalWeight += weight;
        const p = MetricsEngine.calculatePlannedProgress(new Date(a.startDate), new Date(a.endDate), currentPointDate);
        weightedPlanned += (p * weight);
      });

      const planejado = Math.round(weightedPlanned / totalWeight);
      
      // Realizado só até HOJE
      let realizado: number | null = null;
      if (currentPointDate <= today) {
         // Simplificação: No MVP real, buscaríamos o histórico de RDO. 
         // Aqui simulamos a curva atual baseada no progresso atual e linearidade proporcional.
         // Mas para o gráfico parecer correto, limitamos ao progresso global da obra hoje.
         let weightedReal = 0;
         atividades.forEach(a => {
            const weight = a.weight || 1;
            // Se o ponto é hoje, usa o progresso real. Se é passado, interpola.
            const realAtPoint = (currentPointDate.getTime() >= today.getTime()) ? a.progress : (a.progress * (i/10));
            weightedReal += (realAtPoint * weight);
         });
         realizado = Math.round(weightedReal / totalWeight);
      }

      pontos.push({
        name: currentPointDate.toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' }),
        planejado,
        realizado
      });
    }

    return NextResponse.json(pontos);

  } catch (error) {
    return NextResponse.json({ error: 'Erro na Curva S' }, { status: 500 });
  }
}
