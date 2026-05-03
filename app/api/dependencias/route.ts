import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');
    if (!obraId) return NextResponse.json({ error: 'obraId obrigatório' }, { status: 400 });

    const deps = await prisma.dependenciaServico.findMany({
      where: { obraId },
      include: {
        servicoPredecessor: { select: { id: true, name: true, color: true } },
        servicoSucessor: { select: { id: true, name: true, color: true } },
      }
    });

    return NextResponse.json(deps);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dependências' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { obraId, servicoPredecessorId, servicoSucessorId, lagDias } = await request.json();

    if (!obraId || !servicoPredecessorId || !servicoSucessorId) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    if (servicoPredecessorId === servicoSucessorId) {
      return NextResponse.json({ error: 'Serviço não pode depender de si mesmo' }, { status: 400 });
    }

    // Prevent duplicate dependency
    const existing = await prisma.dependenciaServico.findFirst({
      where: { obraId, servicoPredecessorId, servicoSucessorId }
    });
    if (existing) {
      return NextResponse.json({ error: 'Dependência já existe' }, { status: 409 });
    }

    const dep = await prisma.dependenciaServico.create({
      data: { obraId, servicoPredecessorId, servicoSucessorId, lagDias: Number(lagDias) || 0 },
      include: {
        servicoPredecessor: { select: { id: true, name: true, color: true } },
        servicoSucessor: { select: { id: true, name: true, color: true } },
      }
    });

    return NextResponse.json(dep, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar dependência' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.dependenciaServico.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
