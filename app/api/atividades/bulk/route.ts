import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PATCH: marcar atividades como programadas em lote (Kanban)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ids, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 });
    }

    const result = await prisma.atividade.updateMany({
      where: { id: { in: ids } },
      data: {
        status: data.status || 'programado',
        resourceId: data.resourceId || undefined
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Erro no bulk patch:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: criar fluxo de serviço — sequencia atividades por local automaticamente
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { obraId, serviceId, locationIds, duracaoEmDias, dataInicio, peso } = body;

    if (!obraId || !serviceId || !Array.isArray(locationIds) || locationIds.length === 0 || !duracaoEmDias || !dataInicio) {
      return NextResponse.json({
        error: 'obraId, serviceId, locationIds[], duracaoEmDias e dataInicio são obrigatórios'
      }, { status: 400 });
    }

    // Busca os locais na ordem correta
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds }, obraId },
      orderBy: { order: 'asc' }
    });

    if (locations.length === 0) {
      return NextResponse.json({ error: 'Nenhum local encontrado' }, { status: 404 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Sequencia: cada local começa no dia seguinte ao fim do anterior
    const criadas = await prisma.$transaction(async (tx) => {
      const resultado = [];
      let cursor = new Date(dataInicio);

      for (const loc of locations) {
        const inicio = new Date(cursor);
        const fim = new Date(cursor);
        fim.setDate(fim.getDate() + Number(duracaoEmDias) - 1);

        const atividade = await tx.atividade.create({
          data: {
            name: `${service.name} - ${loc.name}`,
            startDate: inicio,
            endDate: fim,
            obraId,
            locationId: loc.id,
            serviceId: service.id,
            status: 'programado',
          },
          include: { location: true, service: true }
        });

        resultado.push(atividade);
        // Próximo local começa no dia seguinte
        cursor = new Date(fim);
        cursor.setDate(cursor.getDate() + 1);
      }

      return resultado;
    }, {
      maxWait: 10000,
      timeout: 120000
    });

    return NextResponse.json({ count: criadas.length, atividades: criadas }, { status: 201 });
  } catch (error) {
    console.error('Erro no bulk create:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
