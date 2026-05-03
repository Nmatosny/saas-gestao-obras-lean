import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      select: {
        id: true,
        custoOrcado: true,
        progress: true,
        plannedProgress: true,
        startDate: true,
        endDate: true,
        baselineInicio: true,
        baselineFim: true,
        status: true,
        isCritical: true,
        causaNaoCumprimento: true,
        service: { select: { id: true, name: true, color: true, custoEstimado: true } }
      }
    });

    if (atividades.length === 0) {
      return NextResponse.json({
        bac: 0, ev: 0, pv: 0, ac: 0,
        spi: 1, cpi: 1, eac: 0, vac: 0,
        desvioFinanceiro: 0, desvioFinanceiroPercent: 0,
        porServico: [], alertas: []
      });
    }

    const today = new Date();

    // BAC: Budget At Completion — total orçado de todas as atividades
    // If custoOrcado is set per activity, use that; otherwise fall back to service.custoEstimado / activityCount
    const servicoCounts: Record<string, number> = {};
    atividades.forEach(a => {
      const svcId = a.service?.id || '';
      servicoCounts[svcId] = (servicoCounts[svcId] || 0) + 1;
    });

    let bac = 0;
    const activitiesWithCost = atividades.map(a => {
      let custo = a.custoOrcado || 0;
      if (custo === 0 && a.service?.custoEstimado) {
        // Distribute service budget evenly across its activities
        const count = servicoCounts[a.service.id] || 1;
        custo = a.service.custoEstimado / count;
      }
      bac += custo;
      return { ...a, custo };
    });

    // EV: Earned Value = Σ (custo_atividade × progress/100)
    const ev = activitiesWithCost.reduce((sum, a) => sum + a.custo * (a.progress / 100), 0);

    // PV: Planned Value = Σ (custo_atividade × plannedProgress/100)
    // Re-calculate plannedProgress from dates
    const pv = activitiesWithCost.reduce((sum, a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const totalDur = end.getTime() - start.getTime();
      const elapsed = today.getTime() - start.getTime();
      let pp = 0;
      if (totalDur > 0) pp = Math.min(100, Math.max(0, (elapsed / totalDur) * 100));
      return sum + a.custo * (pp / 100);
    }, 0);

    // SPI: Schedule Performance Index = EV / PV
    const spi = pv > 0 ? ev / pv : 1;

    // For CPI we'd need AC (Actual Cost), which we don't track yet.
    // Estimate: if on schedule SPI=1 ⟹ CPI≈1; use SPI as proxy.
    const cpi = spi; // placeholder until AC tracking is added
    const ac = ev; // assumption: spending matches earned (no AC data yet)

    // EAC: Estimate At Completion = BAC / CPI
    const eac = cpi > 0 ? bac / cpi : bac;

    // VAC: Variance At Completion = BAC - EAC
    const vac = bac - eac;

    const desvioFinanceiro = ev - pv;
    const desvioFinanceiroPercent = bac > 0 ? (desvioFinanceiro / bac) * 100 : 0;

    // Por serviço
    const svcMap = new Map<string, { name: string; color: string; bac: number; ev: number; progresso: number }>();
    activitiesWithCost.forEach(a => {
      const svc = a.service;
      if (!svc) return;
      if (!svcMap.has(svc.id)) svcMap.set(svc.id, { name: svc.name, color: svc.color, bac: 0, ev: 0, progresso: 0 });
      const entry = svcMap.get(svc.id)!;
      entry.bac += a.custo;
      entry.ev += a.custo * (a.progress / 100);
    });
    const porServico = Array.from(svcMap.values()).map(s => ({
      ...s,
      progresso: s.bac > 0 ? Math.round((s.ev / s.bac) * 100) : 0
    }));

    // Alertas críticos automáticos
    const alertas: { tipo: 'critico' | 'atencao' | 'ok'; mensagem: string }[] = [];

    if (spi < 0.85) alertas.push({ tipo: 'critico', mensagem: `SPI = ${spi.toFixed(2)} — cronograma severamente atrasado. Ação corretiva urgente.` });
    else if (spi < 0.95) alertas.push({ tipo: 'atencao', mensagem: `SPI = ${spi.toFixed(2)} — leve atraso no cronograma. Monitorar de perto.` });
    else alertas.push({ tipo: 'ok', mensagem: `SPI = ${spi.toFixed(2)} — cronograma sob controle.` });

    if (vac < 0 && bac > 0) alertas.push({ tipo: vac < -bac * 0.1 ? 'critico' : 'atencao', mensagem: `Estimativa de estouro: R$ ${Math.abs(vac).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} acima do orçado.` });

    const criticalDelayed = atividades.filter(a => a.isCritical && a.status !== 'concluido' && new Date(a.endDate) < today);
    if (criticalDelayed.length > 0) {
      alertas.push({ tipo: 'critico', mensagem: `${criticalDelayed.length} atividade(s) crítica(s) com prazo vencido.` });
    }

    const topCnc = atividades
      .filter(a => a.causaNaoCumprimento)
      .reduce<Record<string, number>>((acc, a) => {
        acc[a.causaNaoCumprimento!] = (acc[a.causaNaoCumprimento!] || 0) + 1;
        return acc;
      }, {});
    const topCncEntry = Object.entries(topCnc).sort((a, b) => b[1] - a[1])[0];
    if (topCncEntry) {
      alertas.push({ tipo: 'atencao', mensagem: `Principal causa de impedimento: "${topCncEntry[0]}" (${topCncEntry[1]} ocorrência${topCncEntry[1] !== 1 ? 's' : ''}).` });
    }

    return NextResponse.json({
      bac: Math.round(bac * 100) / 100,
      ev: Math.round(ev * 100) / 100,
      pv: Math.round(pv * 100) / 100,
      ac: Math.round(ac * 100) / 100,
      spi: Math.round(spi * 1000) / 1000,
      cpi: Math.round(cpi * 1000) / 1000,
      eac: Math.round(eac * 100) / 100,
      vac: Math.round(vac * 100) / 100,
      desvioFinanceiro: Math.round(desvioFinanceiro * 100) / 100,
      desvioFinanceiroPercent: Math.round(desvioFinanceiroPercent * 10) / 10,
      porServico,
      alertas
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
