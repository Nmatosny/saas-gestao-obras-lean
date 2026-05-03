import { Atividade } from '@prisma/client';

export interface ConstructionStats {
  progress: number;
  plannedProgress: number;
  deviation: number;
  status: 'Saudável' | 'Atenção' | 'Crítico' | 'Concluída';
  ppc?: number;
}

/**
 * Motor de Métricas de Engenharia
 * Centraliza toda a inteligência de cálculo de progresso e confiabilidade.
 */
export const MetricsEngine = {
  
  /**
   * Calcula o progresso planejado linear (Baseline) para uma data específica.
   */
  calculatePlannedProgress(startDate: Date, endDate: Date, targetDate: Date = new Date()): number {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const target = targetDate.getTime();
    
    if (target <= start) return 0;
    if (target >= end) return 100;
    
    const duration = end - start;
    const elapsed = target - start;
    
    return Math.round((elapsed / duration) * 100);
  },

  /**
   * Calcula a saúde de uma atividade ou obra baseada no desvio.
   */
  determineStatus(real: number, planned: number): ConstructionStats['status'] {
    if (real >= 99.9) return 'Concluída';
    
    const deviation = real - planned;
    
    if (deviation < -10) return 'Crítico';
    if (deviation < -5) return 'Atenção';
    return 'Saudável';
  },

  /**
   * Calcula o PPC (Percentual de Planos Concluídos)
   * Baseado no Last Planner System: (Atividades Concluídas / Atividades Programadas)
   */
  calculatePPC(atividades: any[]): number {
    const programadas = atividades.filter(a => a.scheduled);
    if (programadas.length === 0) return 0;
    
    const concluidas = programadas.filter(a => a.status === 'concluido' || a.progress >= 100);
    return Math.round((concluidas.length / programadas.length) * 100);
  },

  /**
   * Calcula Projeção de Término (Forecast)
   * Baseado no Run Rate (Velocidade) atual.
   */
  calculateForecast(startDate: Date, currentProgress: number, targetDate: Date = new Date()): Date | null {
    if (currentProgress <= 0) return null;
    if (currentProgress >= 100) return targetDate;

    const start = startDate.getTime();
    const now = targetDate.getTime();
    const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
    
    if (elapsedDays <= 0) return null;

    const velocityPerDay = currentProgress / elapsedDays;
    const remainingProgress = 100 - currentProgress;
    const remainingDays = remainingProgress / velocityPerDay;

    const forecastDate = new Date(now + remainingDays * (1000 * 60 * 60 * 24));
    return forecastDate;
  }
};
