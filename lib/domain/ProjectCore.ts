/**
 * PROJECT CORE (DOMAIN LAYER)
 * Centraliza toda a inteligência de engenharia de produção e controle.
 * Focado em: S-Curve, PPC, Forecast, EVA (Earned Value Analysis) e Resiliência.
 */

export interface DomainActivity {
  id: string;
  progress: number;
  startDate: string | Date;
  endDate: string | Date;
  weight: number;
  status?: string;
  plannedProgress?: number;
}

export interface SimulationParams {
  boostProdutividade: number;
  recursoExtra: number;
  novaDataInicio?: string | Date;
}

export const ProjectCore = {
  
  /**
   * Calcula o Progresso Planejado (Curva S Não-Linear)
   */
  calculatePlannedProgress(start: Date, end: Date, target: Date): number {
    if (target <= start) return 0;
    if (target >= end) return 100;

    const totalDur = end.getTime() - start.getTime();
    const elapsed = target.getTime() - start.getTime();
    const x = elapsed / totalDur;

    // Polinômio de Hermite (Sigmoide) para Curva S realística
    // Mobilização -> Pico -> Desmobilização
    const sigmoid = x * x * (3 - 2 * x);
    return Math.round(sigmoid * 100);
  },

  /**
   * Calcula o PPC (Percentual de Planos Concluídos)
   */
  calculatePPC(atividades: DomainActivity[]): number {
    const today = new Date();
    const vencidas = atividades.filter(a => new Date(a.endDate) < today);
    if (vencidas.length === 0) return 100;

    const concluidas = vencidas.filter(a => a.progress >= 100).length;
    return Math.round((concluidas / vencidas.length) * 100);
  },

  /**
   * Motor de Forecast: Projeta a nova data de término baseada no atraso real
   */
  calculateForecast(atividades: DomainActivity[]): { impactDays: number; projectedEnd: Date | null } {
    if (atividades.length === 0) return { impactDays: 0, projectedEnd: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maxDelay = 0;
    let maxEndDate = 0;
    let hasAtraso = false;

    for (let i = 0; i < atividades.length; i++) {
      const a = atividades[i];
      const end = new Date(a.endDate).getTime();
      
      // Encontra a data final original do projeto
      if (end > maxEndDate) maxEndDate = end;

      // Calcula atraso se houver
      if (end < today.getTime() && a.progress < 100) {
        hasAtraso = true;
        const delay = Math.ceil((today.getTime() - end) / (1000 * 60 * 60 * 24));
        if (delay > maxDelay) maxDelay = delay;
      }
    }

    if (!hasAtraso) return { impactDays: 0, projectedEnd: null };

    const projectedEnd = new Date(maxEndDate + (maxDelay * 1000 * 60 * 60 * 24));

    return { impactDays: maxDelay, projectedEnd };
  },

  /**
   * Análise de Valor Agregado (EVA) - Otimizada
   */
  calculateEVA(atividades: DomainActivity[]) {
    let totalWeight = 0;
    let ev = 0;
    let pv = 0;
    const today = new Date();

    for (let i = 0; i < atividades.length; i++) {
      const a = atividades[i];
      const w = a.weight || 1;
      totalWeight += w;
      
      ev += (a.progress * w);
      
      const p = this.calculatePlannedProgress(new Date(a.startDate), new Date(a.endDate), today);
      pv += (p * w);
    }

    const spi = pv > 0 ? ev / pv : 1;
    
    return {
      earnedValue: ev / 100,
      plannedValue: pv / 100,
      spi: Number(spi.toFixed(2)),
      totalWeight
    };
  }
};
