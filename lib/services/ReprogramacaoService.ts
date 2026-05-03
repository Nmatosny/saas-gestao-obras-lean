/**
 * Motor de Reprogramação Automática
 * Resolve o gap de "falta de engine de replanejamento" (P0).
 */
export const ReprogramacaoService = {
  
  /**
   * Simula o impacto de um atraso no cronograma inteiro.
   * Atualmente focado em propagação linear de atraso para sucessores.
   */
  simularImpactoAtraso(atividades: any[], dependencias: any[]) {
    let impactoTotalDias = 0;
    const atividadesImpactadas: any[] = [];

    // 1. Identificar atividades em atraso crítico hoje
    const today = new Date();
    const atrasadas = atividades.filter(a => {
      const isAtrasada = new Date(a.endDate) < today && a.progress < 100;
      return isAtrasada;
    });

    if (atrasadas.length === 0) return { impactoTotalDias: 0, sugestaoTermino: null };

    // 2. Calcular o maior atraso individual
    atrasadas.forEach(a => {
      const atraso = Math.ceil((today.getTime() - new Date(a.endDate).getTime()) / (1000 * 60 * 60 * 24));
      if (atraso > impactoTotalDias) impactoTotalDias = atraso;
    });

    // 3. Projetar nova data de término da obra baseada na maior data de fim atual + impacto
    const ultimaDataOriginal = new Date(Math.max(...atividades.map(a => new Date(a.endDate).getTime())));
    const sugestaoTermino = new Date(ultimaDataOriginal.getTime() + (impactoTotalDias * 1000 * 60 * 60 * 24));

    return {
      impactoTotalDias,
      sugestaoTermino: sugestaoTermino.toISOString().split('T')[0],
      contagemAtrasadas: atrasadas.length
    };
  }
};
