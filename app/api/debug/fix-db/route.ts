import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Tenta apenas o comando mais básico de todos: criar a tabela Dependency
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Dependency" (
        "id" TEXT PRIMARY KEY,
        "predecessorId" TEXT NOT NULL,
        "successorId" TEXT NOT NULL,
        "type" TEXT DEFAULT 'FS',
        "lag" INTEGER DEFAULT 0
      )
    `);
    
    return NextResponse.json({ success: true, message: "Tabela Dependency criada/verificada" });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
