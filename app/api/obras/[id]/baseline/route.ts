import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST: snapshot all current startDate/endDate → baselineInicio/baselineFim
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    // Fetch all activities for this obra
    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      select: { id: true, startDate: true, endDate: true }
    });

    if (atividades.length === 0) {
      return NextResponse.json({ error: 'Nenhuma atividade para salvar na baseline' }, { status: 400 });
    }

    // Bulk update: copy current dates into baseline fields
    await prisma.$transaction(
      atividades.map(a =>
        prisma.atividade.update({
          where: { id: a.id },
          data: { baselineInicio: a.startDate, baselineFim: a.endDate }
        })
      )
    );

    return NextResponse.json({ success: true, count: atividades.length });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: check if baseline exists for this obra
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    const count = await prisma.atividade.count({
      where: { obraId, baselineInicio: { not: null } }
    });

    return NextResponse.json({ hasBaseline: count > 0, count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
