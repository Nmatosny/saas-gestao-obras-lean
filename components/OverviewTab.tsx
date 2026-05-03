'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, CheckCircle2,
  Calendar, ChevronRight, ArrowRight, Zap,
  Activity, Target, Sliders, AlertTriangle, XCircle,
  Radio, Cpu, BarChart3
} from 'lucide-react'
import { gerarAlertas, type Alert } from '@/lib/alertService'
import WhatIfSimulator from '@/components/WhatIfSimulator'

import { Atividade, Diario, Obra, FinanceData } from '@/lib/types'

interface OverviewTabProps {
  atividades: Atividade[]
  diarios: Diario[]
  obra: Obra
  onSetAba: (aba: string) => void
}

function SeverityDot({ severity }: { severity: string }) {
  if (severity === 'critico') return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  )
  if (severity === 'atencao') return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
  return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
}

function AlertCard({ alert, onAction }: { alert: Alert; onAction: (tab: string) => void }) {
  const isCritico = alert.severity === 'critico'
  const isAtencao = alert.severity === 'atencao'

  return (
    <div className={`group relative p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${
      isCritico ? 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-red-100/80 hover:shadow-lg' :
      isAtencao ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
      'bg-emerald-50 border-emerald-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center ${
          isCritico ? 'bg-red-100' : isAtencao ? 'bg-amber-100' : 'bg-emerald-100'
        }`}>
          {isCritico
            ? <XCircle className="w-3.5 h-3.5 text-red-600" />
            : isAtencao
            ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityDot severity={alert.severity} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${
              isCritico ? 'text-red-700' : isAtencao ? 'text-amber-700' : 'text-emerald-700'
            }`}>{alert.title}</p>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{alert.message}</p>
          {alert.actionTab && (
            <button
              onClick={() => onAction(alert.actionTab!)}
              className={`mt-3 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                isCritico ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                isAtencao ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                'bg-emerald-100 text-emerald-700'
              }`}
            >
              {alert.action} <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PulsingStatus({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 group hover:bg-white/10 transition-colors cursor-default">
      <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${color}`}>{label}</p>
      <p className={`text-2xl font-black ${color === 'text-slate-500' ? 'text-white' : color.replace('text-', 'text-').replace('-500', '-400')}`}>{value}</p>
    </div>
  )
}

function HealthBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[11px] font-black text-slate-700">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OverviewTab({ atividades, diarios, obra, onSetAba }: OverviewTabProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [financeiro, setFinanceiro] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [simuladorAberto, setSimuladorAberto] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [alertsRes, finRes] = await Promise.all([
          fetch(`/api/obras/${obra.id}/alerts`).catch(() => null),
          fetch(`/api/obras/${obra.id}/stats/financeiro`).catch(() => null),
        ])
        const finData = finRes?.ok ? await finRes.json() : null
        setFinanceiro(finData)

        // Gera alertas localmente com os dados em mãos
        const localAlerts = gerarAlertas(atividades, diarios, finData ? {
          spi: finData.spi,
          cpi: finData.cpi,
          vac: finData.vac,
        } : undefined)

        // Mescla com alertas do backend se disponíveis
        if (alertsRes?.ok) {
          const backendAlerts = await alertsRes.json()
          const merged = [...localAlerts]
          backendAlerts.forEach((ba: Alert) => {
            if (!merged.find(la => la.id === ba.id)) merged.push(ba)
          })
          setAlerts(merged)
        } else {
          setAlerts(localAlerts)
        }
      } finally {
        setLoading(false)
        setLastRefresh(new Date())
      }
    }
    fetchData()
  }, [obra.id, atividades, diarios])

  const stats = useMemo(() => {
    if (atividades.length === 0) return null
    const today = new Date()

    // Filtra atividades com datas válidas para evitar Invalid Date / NaN
    const valid = atividades.filter(a => {
      const e = a.endDate ? new Date(a.endDate) : null
      return e && !isNaN(e.getTime())
    })

    const totalWeight = atividades.reduce((acc, a) => acc + (a.weight || 1), 0)
    const currentProgress = totalWeight > 0
      ? atividades.reduce((acc, a) => acc + ((a.progress || 0) * (a.weight || 1)), 0) / totalWeight
      : 0
    const plannedProgress = totalWeight > 0
      ? atividades.reduce((acc, a) => acc + ((a.plannedProgress || 0) * (a.weight || 1)), 0) / totalWeight
      : 0

    const endTimestamps = valid.map(a => new Date(a.endDate).getTime())
    const endObra = endTimestamps.length > 0 ? new Date(Math.max(...endTimestamps)) : null
    const diasRestantes = endObra ? Math.max(0, Math.round((endObra.getTime() - today.getTime()) / 86400000)) : 0

    const ativsImpedidas = atividades.filter(a => a.status === 'impedido').length
    const ativsDeveriamEstarProntas = valid.filter(a => new Date(a.endDate) < today).length
    const ativsProntas = atividades.filter(a => (a.progress || 0) >= 100).length
    const ppc = ativsDeveriamEstarProntas > 0 ? Math.round((ativsProntas / ativsDeveriamEstarProntas) * 100) : 100
    const desvio = Math.round(currentProgress - plannedProgress)

    return {
      currentProgress: Math.round(currentProgress),
      plannedProgress: Math.round(plannedProgress),
      desvio,
      diasRestantes,
      ativsImpedidas,
      ppc,
      criticos: alerts.filter(a => a.severity === 'critico').length,
    }
  }, [atividades, alerts])

  if (atividades.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] p-20 border-2 border-dashed border-slate-200 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
          <Zap className="w-12 h-12" />
        </div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Bem-vindo à sua nova Obra!</h3>
        <p className="text-slate-500 font-medium max-w-md mx-auto mb-10 text-lg">
          Para começar a gerar inteligência de dados, precisamos do seu cronograma planejado.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => onSetAba('planejamento')} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
            Importar Cronograma
          </button>
        </div>
      </div>
    )
  }

  const critCount = alerts.filter(a => a.severity === 'critico').length

  return (
    <>
      {simuladorAberto && (
        <WhatIfSimulator
          atividades={atividades}
          onClose={() => setSimuladorAberto(false)}
          onAplicar={(cenario) => {
            console.log('Cenário registrado:', cenario)
            setSimuladorAberto(false)
          }}
        />
      )}

      <div className="space-y-8 animate-in fade-in duration-500">

        {/* ── MISSION CONTROL HEADER ── */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] -mr-32 -mt-32" />
          {critCount > 0 && (
            <div className="absolute top-0 left-0 w-40 h-40 bg-red-600/10 rounded-full blur-[80px] -ml-10 -mt-10" />
          )}

          <div className="relative z-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Sistema Ativo — Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSimuladorAberto(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" /> What-If
                </button>
                <button onClick={() => onSetAba('relatorio')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" /> Relatório
                </button>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <PulsingStatus
                label="Progresso Geral"
                value={`${stats?.currentProgress ?? 0}%`}
                color={stats && stats.desvio < -5 ? 'text-red-400' : stats && stats.desvio > 0 ? 'text-emerald-400' : 'text-slate-500'}
              />
              <PulsingStatus
                label="Alertas Críticos"
                value={critCount === 0 ? '✓ OK' : critCount}
                color={critCount > 0 ? 'text-red-400' : 'text-emerald-400'}
              />
              <PulsingStatus
                label="Impedimentos"
                value={stats?.ativsImpedidas ?? 0}
                color={stats && stats.ativsImpedidas > 0 ? 'text-amber-400' : 'text-slate-500'}
              />
              <PulsingStatus
                label="Dias Restantes"
                value={stats?.diasRestantes ?? '—'}
                color="text-slate-500"
              />
            </div>

            {/* Progress bars */}
            <div className="space-y-3 border-t border-white/10 pt-8">
              <HealthBar label="Progresso Real" value={stats?.currentProgress ?? 0} color="bg-blue-500" />
              <HealthBar label="Meta Planejada" value={stats?.plannedProgress ?? 0} color="bg-slate-500" />
              <HealthBar label="PPC (Confiabilidade)" value={stats?.ppc ?? 100} color={stats && stats.ppc < 70 ? 'bg-red-500' : stats && stats.ppc < 85 ? 'bg-amber-500' : 'bg-emerald-500'} />
            </div>

            {/* CTA strip */}
            <div className="mt-8 flex gap-3 flex-wrap">
              <button onClick={() => onSetAba('campo')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Apontar Produção
              </button>
              <button onClick={() => onSetAba('gestao')} className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Ver Diários
              </button>
              <button onClick={() => onSetAba('planejamento')} className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2">
                <Activity className="w-4 h-4" /> Linha de Balanço
              </button>
            </div>
          </div>
        </div>

        {/* ── AÇÕES RECOMENDADAS + CAMINHO CRÍTICO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Alerts panel — 2/3 width */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">Ações Recomendadas</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ordenadas por impacto</p>
                </div>
              </div>
              {critCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {critCount} crítico{critCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl" />)
              ) : alerts.length > 0 ? (
                alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onAction={onSetAba} />
                ))
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-black text-slate-800 mb-1">Tudo saudável</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum desvio detectado hoje</p>
                </div>
              )}
            </div>
          </div>

          {/* Saúde do Caminho Crítico — 1/3 width */}
          <div className="flex flex-col gap-6">
            {/* Critical path health */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-base font-black text-slate-800 tracking-tight">Saúde do Caminho Crítico</h4>
              </div>

              <div className="space-y-4">
                {financeiro ? (
                  <>
                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SPI</span>
                      <span className={`text-sm font-black ${financeiro.spi >= 1 ? 'text-emerald-600' : financeiro.spi >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {financeiro.spi?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPI</span>
                      <span className={`text-sm font-black ${(financeiro.cpi ?? 1) >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {financeiro.cpi?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EAC</span>
                      <span className="text-sm font-black text-slate-700">
                        {financeiro.eac != null
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(financeiro.eac)
                          : '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem dados financeiros</p>
                    <button onClick={() => onSetAba('gestao')} className="mt-3 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      Configurar custos →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* What-If launcher card */}
            <button
              onClick={() => setSimuladorAberto(true)}
              className="bg-slate-900 rounded-[2rem] p-8 text-left hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <Sliders className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulador</span>
              </div>
              <h4 className="text-base font-black text-white tracking-tight mb-1">What-If Analysis</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Simule reforços de equipe, mudanças de ritmo e reprogramações antes de aplicá-las.</p>
              <div className="mt-4 flex items-center gap-1 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Abrir simulador <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>

        {/* ── QUICK NAV ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { tab: 'relatorio', icon: TrendingUp, label: 'Relatório Executivo', desc: 'Curva S, EVA e projeção de entrega.', bg: 'bg-blue-50', icon_color: 'text-blue-600' },
            { tab: 'planejamento', icon: Activity, label: 'Plano de Ataque', desc: 'Linha de balanço, Gantt e dependências.', bg: 'bg-slate-50', icon_color: 'text-slate-600' },
            { tab: 'controladoria', icon: Target, label: 'Controladoria', desc: 'CNC, forecast e PM virtual.', bg: 'bg-violet-50', icon_color: 'text-violet-600' },
          ].map(({ tab, icon: Icon, label, desc, bg, icon_color }) => (
            <button
              key={tab}
              onClick={() => onSetAba(tab)}
              className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all text-left"
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`w-12 h-12 ${bg} ${icon_color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h4 className="text-base font-black text-slate-800 tracking-tight mb-1">{label}</h4>
              <p className="text-xs text-slate-500 font-medium">{desc}</p>
            </button>
          ))}
        </div>

      </div>
    </>
  )
}
