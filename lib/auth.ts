import { getServerSession, Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authOptions } from "./auth-options";

export async function getWorkspaceSession(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { workspaceId?: string } | undefined;
  
  if (!user?.workspaceId) {
    return null;
  }
  return user.workspaceId;
}

export async function validateObraOwnership(obraId: string, workspaceId: string) {
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, workspaceId }
  });
  return !!obra;
}

export async function validateAtividadeOwnership(atividadeId: string, workspaceId: string) {
  const atividade = await prisma.atividade.findFirst({
    where: { id: atividadeId, obra: { workspaceId } }
  });
  return !!atividade;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Não autorizado: Acesso negado a este recurso." }, { status: 401 });
}
