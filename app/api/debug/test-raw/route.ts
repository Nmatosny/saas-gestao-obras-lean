import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Tenta a consulta mais primitiva possível
    const data = await prisma.$queryRawUnsafe(`SELECT * FROM "Atividade" LIMIT 1`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
