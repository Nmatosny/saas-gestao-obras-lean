import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const obra = await prisma.obra.findUnique({
      where: { id },
    });

    if (!obra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar obra' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const obra = await prisma.obra.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar obra' }, { status: 500 });
  }
}
