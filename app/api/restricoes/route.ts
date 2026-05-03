import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const atividadeId = searchParams.get('atividadeId');
    if (!atividadeId) return NextResponse.json({ error: 'atividadeId obrigatório' }, { status: 400 });

    const restricoes = await prisma.restricao.findMany({
      where: { atividadeId },
      orderBy: { resolvido: 'asc' }
    });

    return NextResponse.json(restricoes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar restrições' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { descricao, atividadeId } = body;

    const restricao = await prisma.restricao.create({
      data: { descricao, atividadeId }
    });

    return NextResponse.json(restricao, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar restrição' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, resolvido } = body;

    const restricao = await prisma.restricao.update({
      where: { id },
      data: { resolvido }
    });

    return NextResponse.json(restricao);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar restrição' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.restricao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar restrição' }, { status: 500 });
  }
}
