import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    const services = await prisma.service.findMany({
      where: { obraId }
    });

    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color, obraId, custoEstimado } = body;

    if (!name || !obraId) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        color,
        obraId,
        custoEstimado: Number(custoEstimado) || 0,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar serviço' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, custoEstimado } = body;
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const service = await prisma.service.update({
      where: { id },
      data: { custoEstimado: Number(custoEstimado) || 0 }
    });

    return NextResponse.json(service);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const count = await prisma.atividade.count({ where: { serviceId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Este serviço possui ${count} atividade(s). Remova-as primeiro.` },
        { status: 409 }
      );
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
