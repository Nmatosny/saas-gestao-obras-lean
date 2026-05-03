import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const obra = await prisma.obra.findFirst({
      where: { 
        id,
        workspaceId
      },
    });

    if (!obra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar obra' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    delete body.workspaceId;

    const existingObra = await prisma.obra.findFirst({
      where: {
        id,
        workspaceId
      }
    });

    if (!existingObra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    const obra = await prisma.obra.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar obra' }, { status: 500 });
  }
}
