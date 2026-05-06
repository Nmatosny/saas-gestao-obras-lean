import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const obraId = params.id;
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    // Buscar atividades com seus diários e recursos
    const atividades = await prisma.atividade.findMany({
      where: { obraId },
      include: {
        resource: true,
        service: true,
        location: true,
        diarioAtivs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const stats = atividades.map(ativ => {
      const totalHours = ativ.diarioAtivs.reduce((acc, da) => acc + (da.actualManHours || 0), 0);
      const totalCost = ativ.diarioAtivs.reduce((acc, da) => acc + (da.cost || 0), 0);
      const totalQty = ativ.quantidadeRealizada || 0;
      
      // RUP = Horas Gastas / Quantidade Realizada
      const rup = totalQty > 0 ? Number((totalHours / totalQty).toFixed(2)) : 0;
      const unitCost = totalQty > 0 ? Number((totalCost / totalQty).toFixed(2)) : 0;
      
      return {
        id: ativ.id,
        name: ativ.name,
        resource: ativ.resource?.name || 'Não atribuído',
        service: ativ.service?.name,
        location: ativ.location?.name,
        progress: ativ.progress,
        totalHours,
        totalCost,
        rup,
        unitCost,
        unit: ativ.service?.unit || 'un'
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar stats de produtividade:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
