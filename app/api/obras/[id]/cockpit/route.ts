import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProjectCore, DomainActivity } from '@/lib/domain/ProjectCore';
import { gerarAlertas } from '@/lib/alertService';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';
import type { Atividade, Diario } from '@/lib/types';

/**
 * COCKPIT API (BFF)
 * Versão Hardening 5.0 - Domain Driven
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    // 1. Carregamento Paralelo (Infra)
    const [obra, atividades, diarios, versoes, dependencias] = await Promise.all([
      prisma.obra.findUnique({ where: { id: obraId } }),
      prisma.atividade.findMany({
        where: { obraId },
        include: { service: true, location: true },
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
      prisma.dependency.findMany({ where: { obraId } })
    ]);

    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

    // 2. Processamento via Camada de Domínio (Inteligência)
    const eva = ProjectCore.calculateEVA(atividades as DomainActivity[]);
    const forecast = ProjectCore.calculateForecast(atividades as DomainActivity[]);
    const ppc = ProjectCore.calculatePPC(atividades as DomainActivity[]);
    const alerts = gerarAlertas(atividades as Atividade[], diarios as Diario[]);

    // 3. Consolidação de Estatísticas
    const totalWeight = eva.totalWeight || 1;
    const avgReal = (eva.earnedValue * 100) / totalWeight;
    const avgPlanned = (eva.plannedValue * 100) / totalWeight;

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
        ppc,
        spi: eva.spi,
        projecaoTermino: forecast.projectedEnd ? forecast.projectedEnd.toISOString().split('T')[0] : null,
        atrasoEstimadoDias: forecast.impactDays
      },
      hasBaseline: versoes.length > 0
    };

    return NextResponse.json(cockpitData);
  } catch (error) {
    console.error('Erro no Cockpit API:', error);
    return NextResponse.json({
      error: 'Erro crítico ao consolidar cockpit',
      details: String(error)
    }, { status: 500 });
  }
}
