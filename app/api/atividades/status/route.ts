import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, validateAtividadeOwnership, unauthorizedResponse } from '@/lib/auth';

const VALID_STATUSES = ['programado', 'em_andamento', 'concluido', 'impedido'];

export async function PATCH(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e Status são obrigatórios' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // TENANT GUARD — estava ausente, risco de cross-tenant write
    const isOwner = await validateAtividadeOwnership(id, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const updateData: { status: string; progress?: number } = { status };
    if (status === 'concluido') updateData.progress = 100;

    await prisma.atividade.update({ 
      where: { id }, 
      data: updateData 
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error.message);
    return NextResponse.json({ error: 'Erro ao atualizar status da atividade' }, { status: 500 });
  }
}
