import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
import { AlertService } from '@/lib/services/AlertService';
import { ReprogramacaoService } from '@/lib/services/ReprogramacaoService';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

/**
 * COCKPIT API (BFF - Backend for Frontend)
 * Consolida todos os dados da obra em um único payload otimizado.
 * Resolve o problema de race conditions e desincronização entre abas (P1).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    // Validação de Tenant Guard
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    // Carregamento Atômico (Paralelo)
    const [obra, atividades, diarios, versoes, dependencias] = await Promise.all([
      prisma.obra.findUnique({
        where: { id: obraId }
      }),
      prisma.atividade.findMany({
        where: { obraId },
        include: { service: true, location: true, restricoes: true },
        orderBy: { startDate: 'asc' }
      }),
      prisma.diario.findMany({
        where: { obraId },
        orderBy: { date: 'desc' },
        take: 30 // Últimos 30 dias para o cockpit
      }),
      prisma.versaoCronograma.findMany({
        where: { obraId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.dependency.findMany({
        where: { obraId }
      })
    ]);

    if (!obra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    // Processamento de Inteligência (Alertas Prescritivos)
    const alerts = AlertService.generatePrescriptiveAlerts(atividades as any);

    // Cálculo de Estatísticas Consolidadas
    const today = new Date();
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

    // Cálculo de Projeção Real de Término
    const projecao = ReprogramacaoService.simularImpactoAtraso(atividades, dependencias);

    const cockpitData = {
      obra,
      atividades,
      diarios,
      versoes,
      dependencias,
      alerts,
      stats: {
        progresso: Math.round(avgReal),
        progressoPlanejado: Math.round(avgPlanned),
        desvio: Number((avgReal - avgPlanned).toFixed(1)),
        status: MetricsEngine.determineStatus(avgReal, avgPlanned),
        ppc: MetricsEngine.calculatePPC(atividades as any),
        projecaoTermino: projecao.sugestaoTermino,
        atrasoEstimadoDias: projecao.impactoTotalDias
      },
      hasBaseline: versoes.length > 0
    };

    return NextResponse.json(cockpitData);
  } catch (error) {
    console.error('Erro no Cockpit API:', error);
    return NextResponse.json({ error: 'Erro ao consolidar cockpit' }, { status: 500 });
  }
}
