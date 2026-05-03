import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function getWorkspaceSession() {
  const session = await getServerSession() as any;
  if (!session || !session.user || !session.user.workspaceId) {
    return null;
  }
  return session.user.workspaceId;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
