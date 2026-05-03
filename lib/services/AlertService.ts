import { MetricsEngine } from "../metrics";

interface AtividadeAlert {
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  cost: number;
  weight: number;
  status: string;
  restricoes?: { resolvido: boolean }[];
}

export interface PrescriptiveAlert {
  type: 'critico' | 'atencao' | 'ok';
  title: string;
  message: string;
  action: string;
}

/**
 * Motor de Inteligência Prescritiva
 * Analisa os dados e sugere ações para o engenheiro (P2).
 */
export const AlertService = {
  
  generatePrescriptiveAlerts(atividades: AtividadeAlert[]): PrescriptiveAlert[] {
    const alerts: PrescriptiveAlert[] = [];
    const today = new Date();

    atividades.forEach(a => {
      const planned = MetricsEngine.calculatePlannedProgress(
        new Date(a.startDate),
        new Date(a.endDate),
        today
      );
      
      const deviation = a.progress - planned;

      // Alerta de Atraso em Atividade Crítica
      if (deviation < -15 && (a.cost > 10000 || a.weight > 5)) {
        alerts.push({
          type: 'critico',
          title: `Atraso Crítico: ${a.name}`,
          message: `Desvio de ${Math.abs(deviation).toFixed(0)}% detectado. Recomenda-se reforço de equipe ou renegociação de prazos para evitar impacto no caminho crítico.`,
          action: 'Reforçar Equipe'
        });
      }

      // Alerta de Restrição
      const restricoesAbertas = a.restricoes?.filter(r => !r.resolvido).length || 0;
      if (restricoesAbertas > 0 && a.status === 'planejado' && planned > 0) {
        alerts.push({
          type: 'atencao',
          title: `Bloqueio Iminente: ${a.name}`,
          message: `${restricoesAbertas} restrição(ões) pendente(s) enquanto a atividade já deveria ter iniciado. Risco de paralisação total.`,
          action: 'Resolver Restrições'
        });
      }
    });

    return alerts;
  }
};
