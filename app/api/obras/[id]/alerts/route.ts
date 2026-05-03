import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AlertService } from '@/lib/services/AlertService';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: { restricoes: true }
    });

    const alerts = AlertService.generatePrescriptiveAlerts(atividades);

    return NextResponse.json(alerts);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar alertas' }, { status: 500 });
  }
}
