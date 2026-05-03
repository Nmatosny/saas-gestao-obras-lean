import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e Status são obrigatórios' }, { status: 400 });
    }

    const data: any = { status };
    if (status === 'concluido') {
      data.progress = 100;
    }

    await prisma.atividade.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error.message);
    return NextResponse.json({ error: 'Erro ao atualizar status da atividade' }, { status: 500 });
  }
}
