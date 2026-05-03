/**
 * Motor de Reprogramação Automática
 * Resolve o gap de "falta de engine de replanejamento" (P0).
 */
import type { Atividade } from '@/lib/types';

interface DependenciaSimples {
  predecessorId: string;
  sucessorId: string;
  lagDias?: number;
}

interface ResultadoImpacto {
  impactoTotalDias: number;
  sugestaoTermino: string | null;
  contagemAtrasadas?: number;
}

export const ReprogramacaoService = {

  /**
   * Simula o impacto de um atraso no cronograma utilizando a rede de dependências.
   * Diferente da versão simplista, esta propaga o atraso através dos sucessores.
   */
  simularImpactoAtraso(atividades: Atividade[], dependencias: DependenciaSimples[]): ResultadoImpacto {
    if (atividades.length === 0) return { impactoTotalDias: 0, sugestaoTermino: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Criar um mapa de datas projetadas
    const novasDatasFim: Record<string, number> = {};
    atividades.forEach(a => {
      novasDatasFim[a.id] = new Date(a.endDate).getTime();
    });

    // 2. Aplicar atraso inicial nas atividades críticas hoje
    let contagemAtrasadas = 0;
    atividades.forEach(a => {
      const dataFimOriginal = new Date(a.endDate);
      if (dataFimOriginal < today && a.progress < 100) {
        contagemAtrasadas++;
        // Projeta término: assume que termina "amanhã" no mínimo se já passou do prazo
        novasDatasFim[a.id] = today.getTime() + (1 * 24 * 60 * 60 * 1000);
      }
    });

    // 3. Propagação via Dependências (Algoritmo de Caminho Crítico Simplificado)
    // Executamos algumas iterações para garantir a propagação em cadeia
    for (let i = 0; i < 3; i++) {
      dependencias.forEach(dep => {
        const predFim = novasDatasFim[dep.predecessorId];
        const sucFim = novasDatasFim[dep.sucessorId];
        
        if (predFim && sucFim) {
          const lagMs = (dep.lagDias || 0) * 24 * 60 * 60 * 1000;
          const sucOriginal = atividades.find(a => a.id === dep.sucessorId);
          if (sucOriginal) {
            const duracaoMs = new Date(sucOriginal.endDate).getTime() - new Date(sucOriginal.startDate).getTime();
            const novoInicioMinimo = predFim + lagMs;
            const novoFimMinimo = novoInicioMinimo + duracaoMs;

            if (novoFimMinimo > novasDatasFim[dep.sucessorId]) {
              novasDatasFim[dep.sucessorId] = novoFimMinimo;
            }
          }
        }
      });
    }

    // 4. Calcular impacto final
    const ultimaDataOriginal = Math.max(...atividades.map(a => new Date(a.endDate).getTime()));
    const ultimaDataProjetada = Math.max(...Object.values(novasDatasFim));
    
    const impactoTotalDias = Math.max(0, Math.ceil((ultimaDataProjetada - ultimaDataOriginal) / (1000 * 60 * 60 * 24)));
    const sugestaoTermino = new Date(ultimaDataProjetada);

    return {
      impactoTotalDias,
      sugestaoTermino: sugestaoTermino.toISOString().split('T')[0],
      contagemAtrasadas
    };
  }
};
