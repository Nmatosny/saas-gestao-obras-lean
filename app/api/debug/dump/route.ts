import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId missing' });

    const totalAtividades = await prisma.atividade.count({ where: { obraId } });
    const programadas = await prisma.atividade.count({ where: { obraId, scheduled: true } });
    const amostra = await prisma.atividade.findMany({ 
      where: { obraId }, 
      take: 5,
      select: { id: true, name: true, scheduled: true, status: true, serviceId: true }
    });

    return NextResponse.json({
      obraId,
      totalAtividades,
      programadas,
      amostra
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
