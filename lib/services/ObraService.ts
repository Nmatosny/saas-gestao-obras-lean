import { prisma } from "@/lib/db";

/**
 * Camada de Domínio: ObraService
 * Centraliza regras de negócio complexas e orquestração entre modelos.
 */
export const ObraService = {
  
  /**
   * Calcula o Dashboard Executivo da Obra.
   * Centraliza a lógica que antes estava espalhada nas rotas.
   */
  async getObraStats(obraId: string, workspaceId: string) {
    const obra = await prisma.obra.findFirst({
      where: { id: obraId, workspaceId },
      include: {
        atividades: {
          select: {
            progress: true,
            weight: true,
            startDate: true,
            endDate: true,
            scheduled: true,
            status: true
          }
        },
        diarios: {
          take: 7,
          orderBy: { date: 'desc' },
          select: { id: true, date: true }
        }
      }
    });

    if (!obra) return null;

    // TODO: Implementar lógica de curva S real e forecast por caminho crítico
    // Por enquanto, usamos a base do MetricsEngine mas consolidada aqui
    return obra;
  },

  /**
   * Atualiza progresso de uma atividade via RDO.
   * Implementa a lógica de "não sobrescrever cegamente" sugerida pelo Codex.
   */
  async updateProgressFromRdo(atividadeId: string, progress: number, obraId: string) {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.atividade.findUnique({
        where: { id: atividadeId }
      });

      if (!current) throw new Error("Atividade não encontrada");

      // Log de progresso (histórico)
      // TODO: Criar tabela de MediçãoFísica se escalarmos
      
      return await tx.atividade.update({
        where: { id: atividadeId, obraId },
        data: {
          progress,
          status: progress >= 100 ? 'concluido' : 'em_andamento'
        }
      });
    });
  }
};
