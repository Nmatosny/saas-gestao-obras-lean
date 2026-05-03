import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    const locations = await prisma.location.findMany({
      where: { obraId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { atividades: true } } }
    });

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar locais' }, { status: 500 });
  }
}

// POST: criar um local único OU um range (ex: "Pavimento", de 1 a 20)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, order, obraId, prefixo, de, ate, padraoNome } = body;

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    // Bulk range: cria vários locais numerados
    if (prefixo !== undefined && de !== undefined && ate !== undefined) {
      const existentes = await prisma.location.count({ where: { obraId } });
      const criados = await prisma.$transaction(
        Array.from({ length: Number(ate) - Number(de) + 1 }, (_, i) => {
          const num = Number(de) + i;
          const nomeFinal = padraoNome
            ? padraoNome.replace('{n}', String(num))
            : `${prefixo} ${num}`;
          return prisma.location.create({
            data: { name: nomeFinal, order: existentes + i, obraId }
          });
        })
      );
      return NextResponse.json(criados, { status: 201 });
    }

    // Criação simples
    if (!name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
    const existentes = await prisma.location.count({ where: { obraId } });

    const location = await prisma.location.create({
      data: { name, order: order !== undefined ? Number(order) : existentes, obraId }
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH: reordenar locais (recebe array [{id, order}])
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body; // [{id: string, order: number}]

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates[] é obrigatório' }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map(({ id, order }: { id: string; order: number }) =>
        prisma.location.update({ where: { id }, data: { order } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE: remove um local (só se não tiver atividades vinculadas)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const count = await prisma.atividade.count({ where: { locationId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Este local possui ${count} atividade(s) vinculada(s). Remova-as primeiro.` },
        { status: 409 }
      );
    }

    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
