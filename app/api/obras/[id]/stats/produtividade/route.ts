import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    // Fetch all DiarioAtividade entries with their date and atividade service info
    const registros = await prisma.diarioAtividade.findMany({
      where: { diario: { obraId } },
      include: {
        diario: { select: { date: true } },
        atividade: {
          select: {
            service: { select: { id: true, name: true, color: true } }
          }
        }
      },
      orderBy: { diario: { date: 'asc' } }
    });

    // Group by week + service: aggregate trabalhadores and average progress delta
    const weekMap = new Map<string, { label: string; date: Date; services: Map<string, { trabalhadores: number; progress: number; count: number; name: string; color: string }> }>();

    registros.forEach(r => {
      const d = new Date(r.diario.date);
      // Week key = year + ISO week number
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${weekNum}`;
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

      if (!weekMap.has(key)) weekMap.set(key, { label, date: d, services: new Map() });
      const week = weekMap.get(key)!;

      const svc = r.atividade.service;
      if (!svc) return;

      if (!week.services.has(svc.id)) {
        week.services.set(svc.id, { trabalhadores: 0, progress: 0, count: 0, name: svc.name, color: svc.color });
      }
      const entry = week.services.get(svc.id)!;
      entry.trabalhadores += r.quantidadeTrabalhadores;
      entry.progress += r.progress;
      entry.count += 1;
    });

    // Flatten to a series per service
    const serviceIndex = new Map<string, { name: string; color: string; data: { label: string; trabalhadores: number; produtividade: number }[] }>();

    Array.from(weekMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .forEach(([, week]) => {
        week.services.forEach((entry, svcId) => {
          if (!serviceIndex.has(svcId)) {
            serviceIndex.set(svcId, { name: entry.name, color: entry.color, data: [] });
          }
          const avgProgress = entry.count > 0 ? entry.progress / entry.count : 0;
          const produtividade = entry.trabalhadores > 0 ? avgProgress / entry.trabalhadores : 0;
          serviceIndex.get(svcId)!.data.push({
            label: week.label,
            trabalhadores: entry.trabalhadores,
            produtividade: Math.round(produtividade * 100) / 100
          });
        });
      });

    // Also return overall daily totals for the chart
    const dailyTotals: { label: string; trabalhadores: number }[] = [];
    const dailyMap = new Map<string, number>();

    registros.forEach(r => {
      const d = new Date(r.diario.date);
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      dailyMap.set(label, (dailyMap.get(label) || 0) + r.quantidadeTrabalhadores);
    });
    dailyMap.forEach((v, k) => dailyTotals.push({ label: k, trabalhadores: v }));

    return NextResponse.json({
      porServico: Array.from(serviceIndex.values()),
      diario: dailyTotals
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao calcular produtividade' }, { status: 500 });
  }
}
