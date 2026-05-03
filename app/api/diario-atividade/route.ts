import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { diarioId, atividadeId, progress, status } = body;

    if (!diarioId || !atividadeId) {
      return NextResponse.json({ error: 'diarioId e atividadeId são obrigatórios' }, { status: 400 });
    }

    const vinculo = await prisma.diarioAtividade.create({
      data: {
        diarioId,
        atividadeId,
        progress,
        status,
      },
    });

    return NextResponse.json(vinculo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao vincular atividade ao diário' }, { status: 500 });
  }
}
