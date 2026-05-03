import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');
    if (!obraId) return NextResponse.json({ error: 'obraId obrigatório' }, { status: 400 });

    const versoes = await prisma.cronogramaVersao.findMany({
      where: { obraId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(versoes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar versões' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, obraId, ativa } = body;

    const versao = await prisma.cronogramaVersao.create({
      data: {
        nome,
        obraId,
        ativa: !!ativa
      }
    });

    return NextResponse.json(versao, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar versão' }, { status: 500 });
  }
}
