import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    console.log("Iniciando reparo profundo do banco de dados...");

    // 1. Criar Tabela de Restrições (Checklist do Kanban)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Restricao" (
        "id" TEXT PRIMARY KEY,
        "descricao" TEXT NOT NULL,
        "resolvido" BOOLEAN DEFAULT false,
        "atividadeId" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Restricao_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE
      )
    `);

    // 2. Criar Tabela de Dependências (Caminho Crítico / Gantt)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Dependency" (
        "id" TEXT PRIMARY KEY,
        "predecessorId" TEXT NOT NULL,
        "successorId" TEXT NOT NULL,
        "type" TEXT DEFAULT 'FS',
        "lag" INTEGER DEFAULT 0,
        CONSTRAINT "Dependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Atividade"("id") ON DELETE CASCADE,
        CONSTRAINT "Dependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Atividade"("id") ON DELETE CASCADE
      )
    `);

    // 3. Adicionar colunas faltantes na tabela Atividade (se houver)
    // Usamos blocos isolados para não quebrar se a coluna já existir
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Atividade" ADD COLUMN "isCritical" BOOLEAN DEFAULT false`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Atividade" ADD COLUMN "plannedProgress" INTEGER DEFAULT 0`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Atividade" ADD COLUMN "scheduled" BOOLEAN DEFAULT false`); } catch(e) {}

    return NextResponse.json({ 
      success: true, 
      message: "Diagnóstico de Infraestrutura Concluído",
      details: "Tabelas 'Restricao' e 'Dependency' configuradas com chaves estrangeiras. Colunas de inteligência garantidas na tabela 'Atividade'."
    });
  } catch (error: any) {
    console.error("ERRO NO REPARO DO BANCO:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
