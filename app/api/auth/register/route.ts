import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password, workspaceName } = await request.json();

    if (!email || !password || !workspaceName) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
    }

    // Criar Workspace e Usuário em uma transação
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: workspaceName }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          workspaceId: workspace.id
        }
      });

      return { user, workspace };
    });

    return NextResponse.json({ success: true, userId: result.user.id });
  } catch (error: any) {
    console.error('Erro no registro:', error.message);
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 });
  }
}
