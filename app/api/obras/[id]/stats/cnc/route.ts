import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    const atividades = await prisma.atividade.findMany({
      where: { obraId, causaNaoCumprimento: { not: null } },
      select: { causaNaoCumprimento: true }
    });

    const counts: Record<string, number> = {};
    atividades.forEach(a => {
      if (a.causaNaoCumprimento) {
        counts[a.causaNaoCumprimento] = (counts[a.causaNaoCumprimento] || 0) + 1;
      }
    });

    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    const data = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([causa, count]) => ({
        causa,
        count,
        percentual: total > 0 ? Math.round((count / total) * 100) : 0
      }));

    return NextResponse.json({ total, data });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar CNC' }, { status: 500 });
  }
}
