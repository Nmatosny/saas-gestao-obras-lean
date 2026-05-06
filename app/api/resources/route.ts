import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, unauthorizedResponse } from '@/lib/auth';
import { resourceSchema } from '@/lib/validations';

export async function GET(_request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const resources = await prisma.resource.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar recursos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const json = await request.json();
    const validation = resourceSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.format() }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        ...validation.data,
        workspaceId
      }
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar recurso:', error);
    return NextResponse.json({ error: 'Erro ao criar recurso' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

    await prisma.resource.delete({
      where: { id, workspaceId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar recurso' }, { status: 500 });
  }
}
