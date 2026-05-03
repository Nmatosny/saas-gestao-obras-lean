import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    const today = new Date();

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: {
        location: true,
        service: true,
        restricoes: {
          select: { id: true, resolvido: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    const atividadesFormatadas = atividades.map(ativ => {
      const start = new Date(ativ.startDate);
      const end = new Date(ativ.endDate);
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = today.getTime() - start.getTime();

      let plannedProgress = 0;
      if (totalDuration > 0) {
        plannedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }

      return {
        ...ativ,
        plannedProgress: Math.round(plannedProgress)
      };
    });

    return NextResponse.json(atividadesFormatadas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.scheduled !== undefined) updateData.scheduled = Boolean(data.scheduled);
    if (data.progress !== undefined) updateData.progress = Number(data.progress);
    if (data.causaNaoCumprimento !== undefined) updateData.causaNaoCumprimento = data.causaNaoCumprimento || null;
    if (data.impactoDescricao !== undefined) updateData.impactoDescricao = data.impactoDescricao || null;
    if (data.custoOrcado !== undefined) updateData.custoOrcado = Number(data.custoOrcado);

    await prisma.atividade.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
