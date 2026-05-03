import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: obraId } = await params;

    // 1. Busca todas as atividades com pesos e datas
    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        weight: true,
        progress: true,
      }
    });

    if (atividades.length === 0) return NextResponse.json([]);

    // 2. Busca todo o histórico de avanços registrados nos diários
    const historicoAvancos = await prisma.diarioAtividade.findMany({
      where: { diario: { obraId } },
      include: { diario: true },
      orderBy: { diario: { date: 'asc' } }
    });

    const minDate = new Date(Math.min(...atividades.map(a => a.startDate.getTime())));
    const maxDate = new Date(Math.max(...atividades.map(a => a.endDate.getTime())));
    
    // Gerar pontos semanais
    const labels: string[] = [];
    const planned: number[] = [];
    const realized: number[] = [];

    const cursor = new Date(minDate);
    cursor.setDate(cursor.getDate() + (7 - cursor.getDay())); // Próximo domingo

    while (cursor <= new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      const dateLabel = cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      labels.push(dateLabel);

      // Cálculo Planejado Acumulado para esta data
      let totalPlanned = 0;
      let totalWeight = 0;
      atividades.forEach(a => {
        totalWeight += (a.weight || 1);
        const start = a.startDate.getTime();
        const end = a.endDate.getTime();
        const current = cursor.getTime();

        if (current <= start) {
          totalPlanned += 0;
        } else if (current >= end) {
          totalPlanned += (a.weight || 1) * 100;
        } else {
          const duration = end - start;
          const elapsed = current - start;
          totalPlanned += (a.weight || 1) * (elapsed / duration) * 100;
        }
      });
      planned.push(Math.round(totalPlanned / (totalWeight || 1)));

      // Cálculo Realizado Acumulado para esta data (Ponto 1 - RESOLVIDO)
      // Buscamos o ÚLTIMO avanço registrado para cada atividade ATÉ esta data
      let totalRealized = 0;
      atividades.forEach(a => {
        const avancosAteData = historicoAvancos.filter(h => 
          h.atividadeId === a.id && 
          h.diario.date.getTime() <= cursor.getTime()
        );
        
        if (avancosAteData.length > 0) {
          const ultimoAvanco = avancosAteData[avancosAteData.length - 1];
          totalRealized += (a.weight || 1) * ultimoAvanco.progress;
        } else {
          totalRealized += 0;
        }
      });

      // Só adiciona ao gráfico se for no passado ou se houver dados
      if (cursor <= new Date() || realized[realized.length-1] < planned[planned.length-1]) {
        realized.push(Math.round(totalRealized / (totalWeight || 1)));
      } else {
        realized.push(null as any);
      }

      cursor.setDate(cursor.getDate() + 7);
    }

    const data = labels.map((l, i) => ({
      name: l,
      planejado: planned[i],
      realizado: realized[i]
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar Curva S' }, { status: 500 });
  }
}
