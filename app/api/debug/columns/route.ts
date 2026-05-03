import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Atividade'
    `);
    return NextResponse.json({ columns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
