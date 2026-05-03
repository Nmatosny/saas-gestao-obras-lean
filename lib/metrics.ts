interface AtividadePPC {
  scheduled: boolean;
  status: string;
  progress: number;
}

export interface ConstructionStats {
  progress: number;
  plannedProgress: number;
  deviation: number;
  status: 'Saudável' | 'Atenção' | 'Crítico' | 'Concluída';
  ppc?: number;
}

/**
 * Motor de Métricas de Engenharia v2
 * Atendendo aos requisitos de auditoria (Prevision-grade)
 */
export const MetricsEngine = {
  
  /**
   * Calcula o progresso planejado considerando distribuição não-linear (Curva S).
   * Uma curva S típica de construção inicia lenta (mobilização), acelera (pico) e desacelera (acabamento).
   */
  calculatePlannedProgress(startDate: Date, endDate: Date, targetDate: Date = new Date()): number {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const target = targetDate.getTime();
    
    if (target <= start) return 0;
    if (target >= end) return 100;
    
    const duration = end - start;
    const elapsed = target - start;
    const x = elapsed / duration; // Valor de 0 a 1

    // FUNÇÃO SIGMÓIDE (Curva S Simplificada)
    // f(x) = x^2 * (3 - 2x) -> Polinômio de Hermite para suavização
    const sCurveValue = x * x * (3 - 2 * x);
    
    return Math.round(sCurveValue * 100);
  },

  /**
   * Determina o status com base no desvio acumulado.
   */
  determineStatus(real: number, planned: number): ConstructionStats['status'] {
    if (real >= 99.9) return 'Concluída';
    
    const deviation = real - planned;
    
    // Critérios mais rigorosos conforme auditoria
    if (deviation < -15) return 'Crítico';
    if (deviation < -7) return 'Atenção';
    return 'Saudável';
  },

  /**
   * Calcula o PPC (Percentual de Planos Concluídos)
   */
  calculatePPC(atividades: AtividadePPC[]): number {
    const programadas = atividades.filter(a => a.scheduled);
    if (programadas.length === 0) return 0;
    
    const concluidas = programadas.filter(a => a.status === 'concluido' || a.progress >= 100);
    return Math.round((concluidas.length / programadas.length) * 100);
  },

  /**
   * Projeção de Término Realista (Forecast)
   * Considera a tendência de produtividade recente.
   */
  calculateForecast(startDate: Date, currentProgress: number, targetDate: Date = new Date()): Date | null {
    if (currentProgress <= 0) return null;
    if (currentProgress >= 100) return targetDate;

    const start = startDate.getTime();
    const now = targetDate.getTime();
    const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
    
    if (elapsedDays <= 5) return null; // Ignora se tiver pouco histórico para evitar distorção

    const velocityPerDay = currentProgress / elapsedDays;
    const remainingProgress = 100 - currentProgress;
    const remainingDays = remainingProgress / velocityPerDay;

    return new Date(now + remainingDays * (1000 * 60 * 60 * 24));
  }
};
