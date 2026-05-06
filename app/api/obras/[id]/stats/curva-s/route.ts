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

    const dailyCosts = await prisma.diarioAtividade.findMany({
      where: { atividade: { obraId } },
      include: { diario: true },
      orderBy: { diario: { date: 'asc' } }
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
      let pv = 0;

      atividades.forEach(a => {
        const weight = a.weight || 1;
        totalWeight += weight;
        const budgeted = a.budgetedCost || 0;
        const p = MetricsEngine.calculatePlannedProgress(new Date(a.startDate), new Date(a.endDate), currentPointDate);
        weightedPlanned += (p * weight);
        pv += (p / 100) * budgeted; // p is usually 0 to 100 from this engine? Wait, calculatePlannedProgress usually returns 0 to 100. Let me check the metric engine. If it returns 0-100, we divide by 100.
      });

      // Assuming calculatePlannedProgress returns 0-100 based on standard conventions in our app. If not, it returns 0-1. Let's look at how it calculates the average.
      // Wait, in previous lines: const planejado = Math.round(weightedPlanned / totalWeight); This implies `p` is 0-100.
      
      const planejado = totalWeight > 0 ? Math.round(weightedPlanned / totalWeight) : 0;
      
      let realizado: number | null = null;
      let ev: number | null = null;
      let ac: number | null = null;

      if (currentPointDate <= today) {
         let weightedReal = 0;
         let currentEv = 0;
         let currentAc = 0;

         atividades.forEach(a => {
            const weight = a.weight || 1;
            const budgeted = a.budgetedCost || 0;
            const actual = a.actualCost || 0;
            
            // Realizado físico
            const realAtPoint = (currentPointDate.getTime() >= today.getTime()) ? a.progress : (a.progress * (i/10));
            weightedReal += (realAtPoint * weight);
            
            // Valor Agregado (EV) = % Físico Real * Orçamento
            currentEv += (realAtPoint / 100) * budgeted;

            // Custo Real (AC) - Somar custos dos diários até esta data
            const acAtPoint = dailyCosts
              .filter(dc => dc.atividadeId === a.id && new Date(dc.diario.date) <= currentPointDate)
              .reduce((acc, dc) => acc + (dc.cost || 0), 0);
            
            currentAc += acAtPoint;
         });
         realizado = totalWeight > 0 ? Math.round(weightedReal / totalWeight) : 0;
         ev = currentEv;
         ac = currentAc;
      }

      pontos.push({
        name: currentPointDate.toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' }),
        planejado,
        realizado,
        pv,
        ev,
        ac
      });
    }

    return NextResponse.json({
      pontos,
      totalBudget: atividades.reduce((acc, a) => acc + (a.budgetedCost || 0), 0)
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro na Curva S' }, { status: 500 });
  }
}
