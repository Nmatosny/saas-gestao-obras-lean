import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const obraId = params.id;

    // 1. Buscar todas as atividades para identificar locais vinculados
    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: { location: true }
    });

    // 2. Extrair locais únicos que estão no cronograma mas talvez não na lista master
    const uniqueLocations = new Map<string, string>(); // name -> id (if exists)
    atividades.forEach(a => {
      if (a.location) {
        uniqueLocations.set(a.location.name, a.locationId);
      }
    });

    // 3. Garantir que todos esses locais existam na tabela Location
    // (createMany com skipDuplicates é o ideal aqui)
    const existingLocations = await prisma.location.findMany({
      where: { obraId }
    });
    const existingNames = new Set(existingLocations.map(l => l.name.toLowerCase().trim()));

    const toCreate = Array.from(uniqueLocations.keys()).filter(name => !existingNames.has(name.toLowerCase().trim()));

    if (toCreate.length > 0) {
      const lastOrder = existingLocations.length > 0 
        ? Math.max(...existingLocations.map(l => l.order))
        : -1;

      await prisma.location.createMany({
        data: toCreate.map((name, i) => ({
          name,
          obraId,
          order: lastOrder + 1 + i
        }))
      });
    }

    return NextResponse.json({ success: true, created: toCreate.length });
  } catch (error) {
    console.error('Erro ao sincronizar locais:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar locais' }, { status: 500 });
  }
}
