import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get('obraId');

    if (!obraId) return NextResponse.json({ error: 'obraId é obrigatório' }, { status: 400 });

    const today = new Date();

    // Query Robusta via SQL Puro
    // Tenta buscar restrições se a tabela existir, senão retorna array vazio
    let atividades: any[] = [];
    try {
      atividades = await prisma.$queryRawUnsafe(`
        SELECT a.*, 
               l.name as "locationName", l.order as "locationOrder",
               s.name as "serviceName", s.color as "serviceColor"
        FROM "Atividade" a
        LEFT JOIN "Location" l ON a."locationId" = l.id
        LEFT JOIN "Service" s ON a."serviceId" = s.id
        WHERE a."obraId" = $1
        ORDER BY a."startDate" ASC
      `, obraId);
    } catch (e) {
      console.error("Erro na query principal:", e);
      return NextResponse.json({ error: 'Erro ao acessar o banco de dados' }, { status: 500 });
    }

    const atividadesFormatadas = atividades.map(ativ => {
      const start = new Date(ativ.startDate);
      const end = new Date(ativ.endDate);
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = today.getTime() - start.getTime();

      let plannedProgress = 0;
      if (totalDuration > 0) {
        plannedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }

      return {
        ...ativ,
        restricoes: [], // As restrições serão carregadas sob demanda no modal para evitar overhead
        location: { id: ativ.locationId, name: ativ.locationName, order: ativ.locationOrder },
        service: { id: ativ.serviceId, name: ativ.serviceName, color: ativ.serviceColor },
        plannedProgress: Math.round(plannedProgress)
      };
    });

    return NextResponse.json(atividadesFormatadas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (data.status) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "status" = $1 WHERE "id" = $2`, data.status, id);
    }
    
    if (data.scheduled !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "scheduled" = $1 WHERE "id" = $2`, Boolean(data.scheduled), id);
    }

    if (data.progress !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "progress" = $1 WHERE "id" = $2`, Number(data.progress), id);
    }

    if (data.causaNaoCumprimento !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "causaNaoCumprimento" = $1 WHERE "id" = $2`, data.causaNaoCumprimento || null, id);
    }

    if (data.impactoDescricao !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "impactoDescricao" = $1 WHERE "id" = $2`, data.impactoDescricao || null, id);
    }

    if (data.custoOrcado !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE "Atividade" SET "custoOrcado" = $1 WHERE "id" = $2`, Number(data.custoOrcado), id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
