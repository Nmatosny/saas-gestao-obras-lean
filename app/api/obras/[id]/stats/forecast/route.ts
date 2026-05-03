import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    // TENANT GUARD
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const atividades = await prisma.atividade.findMany({
      where: { obraId, scheduled: true },
      include: { service: true }
    });

    if (atividades.length === 0) {
      return NextResponse.json({ conclusaoPlanejada: null, conclusaoProjetada: null, deltasDias: 0, porServico: [] });
    }

    const today = new Date();
    
    // Conclusão Planejada (Fim da última atividade no cronograma)
    const planejadoDates = atividades.map(a => new Date(a.endDate).getTime());
    const conclusaoPlanejada = new Date(Math.max(...planejadoDates));

    // Forecast por Atividade usando MetricsEngine v2 (Não-linear)
    const servicoStats: Record<string, { name: string; color: string; progresso: number; planned: string; projetada: string | null; delta: number }> = {};

    atividades.forEach(a => {
      const projetada = MetricsEngine.calculateForecast(new Date(a.startDate), a.progress, today);
      const servName = a.service?.name || 'Geral';
      const plannedEnd = new Date(a.endDate);
      
      const delta = projetada 
        ? Math.round((projetada.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (!servicoStats[servName] || delta > servicoStats[servName].delta) {
        servicoStats[servName] = {
          name: servName,
          color: a.service?.color || '#3b82f6',
          progresso: a.progress,
          planned: plannedEnd.toISOString(),
          projetada: projetada ? projetada.toISOString() : null,
          delta
        };
      }
    });

    // Conclusão Projetada Global (Pior cenário das atividades)
    const projetadaDates = atividades
      .map(a => MetricsEngine.calculateForecast(new Date(a.startDate), a.progress, today))
      .filter(d => d !== null)
      .map(d => d!.getTime());
    
    const conclusaoProjetada = projetadaDates.length > 0 
      ? new Date(Math.max(...projetadaDates)) 
      : conclusaoPlanejada;

    const deltaTotal = Math.round((conclusaoProjetada.getTime() - conclusaoPlanejada.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      conclusaoPlanejada: conclusaoPlanejada.toISOString(),
      conclusaoProjetada: conclusaoProjetada.toISOString(),
      deltasDias: deltaTotal,
      porServico: Object.values(servicoStats)
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro no forecast' }, { status: 500 });
  }
}
