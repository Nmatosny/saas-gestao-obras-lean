import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
import { gerarAlertas } from '@/lib/alertService';
import { ReprogramacaoService } from '@/lib/services/ReprogramacaoService';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

/**
 * COCKPIT API (BFF - Backend for Frontend)
 * Consolida todos os dados da obra em um único payload otimizado.
 */
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
        include: { atividades: true },
        orderBy: { date: 'desc' },
        take: 30
      }),
      prisma.cronogramaVersao.findMany({
        where: { obraId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.dependency.findMany({
        where: { predecessor: { obraId } }
      })
    ]);

    if (!obra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    // Processamento de Inteligência — isolado para não crashar o payload inteiro
    let alerts: any[] = [];
    try {
      alerts = gerarAlertas(atividades as any, diarios as any);
    } catch (e) {
      console.warn('gerarAlertas falhou, ignorando alertas:', e);
    }

    // Cálculo de Estatísticas Consolidadas
    const today = new Date();
    let totalWeight = 0;
    let weightedReal = 0;
    let weightedPlanned = 0;

    atividades.forEach(a => {
      // Ignora atividades com datas inválidas para não gerar NaN
      if (!a.startDate || !a.endDate) return;
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      const weight = a.weight || 1;
      totalWeight += weight;
      weightedReal += (a.progress * weight);

      const planned = MetricsEngine.calculatePlannedProgress(start, end, today);
      weightedPlanned += (planned * weight);
    });

    const avgReal = totalWeight > 0 ? weightedReal / totalWeight : 0;
    const avgPlanned = totalWeight > 0 ? weightedPlanned / totalWeight : 0;

    let projecao: any = { impactoTotalDias: 0, sugestaoTermino: null };
    try {
      projecao = ReprogramacaoService.simularImpactoAtraso(atividades, dependencias);
    } catch (e) {
      console.warn('ReprogramacaoService falhou, ignorando projeção:', e);
    }

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
  } catch (error: any) {
    console.error('Erro no Cockpit API:', error);
    return NextResponse.json({ 
      error: 'Erro ao consolidar cockpit', 
      details: error.message
    }, { status: 500 });
  }
}
