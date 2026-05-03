import { Atividade, Diario, FinanceData } from './types'

export type AlertSeverity = 'critico' | 'atencao' | 'ok'

export type Alert = {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  action: string
  actionTab?: string  // which tab to navigate to
  meta?: Record<string, unknown>
}

function safeDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function gerarAlertas(
  atividades: Atividade[],
  diarios: Diario[] = [],
  financeiro?: FinanceData
): Alert[] {
  const alerts: Alert[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. Atividades atrasadas (passou do prazo, não concluída)
  const atrasadas = atividades.filter(a => {
    const fim = safeDate(a.endDate)
    return fim && fim < today && a.progress < 100 && a.status !== 'concluido'
  })
  if (atrasadas.length > 0) {
    const top = atrasadas.sort((a, b) => (b.weight || 1) - (a.weight || 1))[0]
    const topEnd = safeDate(top.endDate)
    const diasAtraso = topEnd ? Math.round((today.getTime() - topEnd.getTime()) / 86400000) : 0
    alerts.push({
      id: 'atrasadas',
      severity: atrasadas.length >= 3 ? 'critico' : 'atencao',
      title: `${atrasadas.length} atividade${atrasadas.length > 1 ? 's' : ''} em atraso`,
      message: `"${top.name}" está ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''} após o prazo. ${atrasadas.length > 1 ? `Mais ${atrasadas.length - 1} atividade(s) também estão atrasadas.` : ''}`,
      action: 'Apontar progresso',
      actionTab: 'campo',
      meta: { atrasadasIds: atrasadas.map(a => a.id) },
    })
  }

  // 2. Atividades impedidas sem resolução
  const impedidas = atividades.filter(a => a.status === 'impedido')
  if (impedidas.length > 0) {
    alerts.push({
      id: 'impedidas',
      severity: 'critico',
      title: `${impedidas.length} impedimento${impedidas.length > 1 ? 's' : ''} aberto${impedidas.length > 1 ? 's' : ''}`,
      message: `${impedidas.map(a => `"${a.name}"`).slice(0, 2).join(', ')}${impedidas.length > 2 ? ` e mais ${impedidas.length - 2}` : ''} está${impedidas.length > 1 ? 'ão' : ''} impedida${impedidas.length > 1 ? 's' : ''}. Sem ação, o atraso se propaga para dependências.`,
      action: 'Ver no Kanban',
      actionTab: 'gestao',
    })
  }

  // 3. Desvio de progresso alto (plannedProgress vs progress)
  const comDesvio = atividades.filter(a => {
    const plann = a.plannedProgress ?? 0
    return plann > 0 && (plann - a.progress) >= 15
  })
  if (comDesvio.length > 0) {
    const pior = comDesvio.reduce((acc, a) => ((a.plannedProgress ?? 0) - a.progress) > ((acc.plannedProgress ?? 0) - acc.progress) ? a : acc)
    const desvio = Math.round((pior.plannedProgress ?? 0) - pior.progress)
    alerts.push({
      id: 'desvio_progresso',
      severity: desvio >= 25 ? 'critico' : 'atencao',
      title: `Desvio de ${desvio}% no progresso`,
      message: `"${pior.name}" deveria estar em ${pior.plannedProgress}% mas está em ${pior.progress}%. Avalie a capacidade de recuperação antes da próxima janela de lookahead.`,
      action: 'Analisar cronograma',
      actionTab: 'planejamento',
    })
  }

  // 4. Sem RDO nos últimos 3 dias úteis
  const ultimoDiario = diarios
    .filter(d => safeDate(d.date) !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  if (ultimoDiario) {
    const diarDate = safeDate(ultimoDiario.date)!
    const diasSemDiario = Math.round((today.getTime() - diarDate.getTime()) / 86400000)
    if (diasSemDiario >= 3) {
      alerts.push({
        id: 'sem_rdo',
        severity: 'atencao',
        title: `${diasSemDiario} dias sem RDO`,
        message: `O último diário foi registrado em ${diarDate.toLocaleDateString('pt-BR')}. A falta de registros compromete a rastreabilidade e o cálculo do PPC.`,
        action: 'Abrir RDO',
        actionTab: 'campo',
      })
    }
  }

  // 5. SPI abaixo de 0.85 (alerta financeiro/prazo)
  if (financeiro?.spi !== undefined && financeiro.spi < 0.85) {
    const spi = financeiro.spi.toFixed(2)
    alerts.push({
      id: 'spi_baixo',
      severity: financeiro.spi < 0.7 ? 'critico' : 'atencao',
      title: `SPI crítico: ${spi}`,
      message: `O índice de desempenho de prazo está em ${spi} (meta: ≥ 1.0). Em ritmo atual, a entrega atrasará. Recomenda-se revisão do caminho crítico.`,
      action: 'Ver Relatório EVA',
      actionTab: 'relatorio',
    })
  }

  // 6. VAC negativo (desvio de custo projetado)
  if (financeiro?.vac !== undefined && financeiro.vac < 0) {
    const vac = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Math.abs(financeiro.vac))
    alerts.push({
      id: 'vac_negativo',
      severity: 'atencao',
      title: `Estouro de custo projetado: ${vac}`,
      message: `O custo final estimado (EAC) supera o orçamento (BAC) em ${vac}. Revise as estimativas de custo e o escopo das atividades restantes.`,
      action: 'Ver EVA',
      actionTab: 'relatorio',
    })
  }

  // 7. CNC recorrente (mesma causa em 3+ atividades)
  const cncCounts: Record<string, number> = {}
  atividades.forEach(a => {
    if (a.causaNaoCumprimento) {
      cncCounts[a.causaNaoCumprimento] = (cncCounts[a.causaNaoCumprimento] || 0) + 1
    }
  })
  const cncRecorrente = Object.entries(cncCounts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])[0]
  if (cncRecorrente) {
    alerts.push({
      id: 'cnc_recorrente',
      severity: 'atencao',
      title: `CNC recorrente: "${cncRecorrente[0]}"`,
      message: `Esta causa de não-cumprimento aparece em ${cncRecorrente[1]} atividades. Eliminar esta causa sistêmica tem alto potencial de recuperação de prazo.`,
      action: 'Ver Pareto CNC',
      actionTab: 'controladoria',
    })
  }

  // Ordena: critico primeiro
  return alerts.sort((a, b) => {
    const order = { critico: 0, atencao: 1, ok: 2 }
    return order[a.severity] - order[b.severity]
  })
}
