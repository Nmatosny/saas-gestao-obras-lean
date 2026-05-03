import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        progress: true,
        status: true,
        serviceId: true,
        service: { select: { name: true, color: true } }
      }
    });

    if (atividades.length === 0) {
      return NextResponse.json({ conclusaoPlanejada: null, conclusaoProjetada: null, deltasDias: 0, porServico: [] });
    }

    // Duração real medida nos diários (velocidade real de progresso)
    const historicoAvancos = await prisma.diarioAtividade.findMany({
      where: { diario: { obraId } },
      include: { diario: { select: { date: true } } },
      orderBy: { diario: { date: 'asc' } }
    });

    const today = new Date();
    const conclusaoPlanejada = new Date(Math.max(...atividades.map(a => a.endDate.getTime())));

    // Velocidade geral: % de progresso / dias passados
    const startObra = new Date(Math.min(...atividades.map(a => a.startDate.getTime())));
    const diasPassados = Math.max(1, (today.getTime() - startObra.getTime()) / 86400000);

    const totalWeight = atividades.length;
    const currentProgress = atividades.reduce((acc, a) => acc + a.progress, 0) / totalWeight;
    const velocidadeDiaria = currentProgress / diasPassados;

    let conclusaoProjetada: Date | null = null;
    let deltasDias = 0;

    if (velocidadeDiaria > 0 && currentProgress < 100) {
      const diasRestantes = (100 - currentProgress) / velocidadeDiaria;
      conclusaoProjetada = new Date(today.getTime() + diasRestantes * 86400000);
      deltasDias = Math.round((conclusaoProjetada.getTime() - conclusaoPlanejada.getTime()) / 86400000);
    } else if (currentProgress >= 100) {
      conclusaoProjetada = today;
      deltasDias = Math.round((today.getTime() - conclusaoPlanejada.getTime()) / 86400000);
    }

    // Por serviço: velocidade individual
    const servicoMap = new Map<string, { name: string; color: string; progresso: number; planned: Date; projetada: Date | null; delta: number }>();
    const groupedByService = new Map<string, typeof atividades>();
    atividades.forEach(a => {
      if (!groupedByService.has(a.serviceId)) groupedByService.set(a.serviceId, []);
      groupedByService.get(a.serviceId)!.push(a);
    });

    groupedByService.forEach((atvsServico, serviceId) => {
      const svc = atvsServico[0].service!;
      const svcPlanned = new Date(Math.max(...atvsServico.map(a => a.endDate.getTime())));
      const svcStart = new Date(Math.min(...atvsServico.map(a => a.startDate.getTime())));
      const svcDiasPassados = Math.max(1, (today.getTime() - svcStart.getTime()) / 86400000);
      const svcProgress = atvsServico.reduce((s, a) => s + a.progress, 0) / atvsServico.length;
      const svcVel = svcProgress / svcDiasPassados;

      let svcProjetada: Date | null = null;
      let svcDelta = 0;
      if (svcVel > 0 && svcProgress < 100) {
        const dias = (100 - svcProgress) / svcVel;
        svcProjetada = new Date(today.getTime() + dias * 86400000);
        svcDelta = Math.round((svcProjetada.getTime() - svcPlanned.getTime()) / 86400000);
      } else if (svcProgress >= 100) {
        svcProjetada = today;
        svcDelta = Math.round((today.getTime() - svcPlanned.getTime()) / 86400000);
      }

      servicoMap.set(serviceId, {
        name: svc.name,
        color: svc.color,
        progresso: Math.round(svcProgress),
        planned: svcPlanned,
        projetada: svcProjetada,
        delta: svcDelta
      });
    });

    return NextResponse.json({
      conclusaoPlanejada: conclusaoPlanejada.toISOString(),
      conclusaoProjetada: conclusaoProjetada?.toISOString() ?? null,
      deltasDias,
      porServico: Array.from(servicoMap.values())
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao calcular forecast' }, { status: 500 });
  }
}
