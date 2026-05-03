import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e Status são obrigatórios' }, { status: 400 });
    }

    // Lógica de negócio: Se o status for Concluído, forçamos o progresso para 100%
    if (status === 'concluido') {
      await prisma.$executeRawUnsafe(
        `UPDATE "Atividade" SET "status" = $1, "progress" = 100 WHERE "id" = $2`,
        status, id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "Atividade" SET "status" = $1 WHERE "id" = $2`,
        status, id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status (SQL):', error.message);
    return NextResponse.json({ error: 'Erro ao atualizar status da atividade' }, { status: 500 });
  }
}
