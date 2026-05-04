import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MetricsEngine } from '@/lib/metrics';
import { getWorkspaceSession, validateObraOwnership, validateAtividadeOwnership, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    // TENANT GUARD: Validar se a obra pertence ao workspace
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const today = new Date();

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: {
        location: true,
        service: true,
        restricoes: {
          select: { id: true, status: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    const atividadesFormatadas = atividades.map(ativ => {
      const plannedProgress = MetricsEngine.calculatePlannedProgress(
        new Date(ativ.startDate),
        new Date(ativ.endDate),
        today
      );

      return {
        ...ativ,
        plannedProgress: Math.round(plannedProgress)
      };
    });

    return NextResponse.json(atividadesFormatadas);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    // TENANT GUARD: Validar se a atividade pertence ao workspace do usuário
    const isOwner = await validateAtividadeOwnership(id, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.scheduled !== undefined) updateData.scheduled = Boolean(data.scheduled);
    if (data.progress !== undefined) updateData.progress = Number(data.progress);
    if (data.causaNaoCumprimento !== undefined) updateData.causaNaoCumprimento = data.causaNaoCumprimento || null;
    if (data.impactoDescricao !== undefined) updateData.impactoDescricao = data.impactoDescricao || null;
    if (data.budgetedCost !== undefined) updateData.budgetedCost = Number(data.budgetedCost);

    await prisma.atividade.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
