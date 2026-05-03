'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Sliders, Play, RotateCcw, TrendingUp, TrendingDown,
  Calendar, Zap, ChevronDown, ChevronUp, X, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, Layers
} from 'lucide-react'

type Atividade = {
  id: string
  name: string
  progress: number
  startDate: string
  endDate: string
  weight: number
  serviceId?: string
  serviceName?: string
}

type Cenario = {
  label: string
  boostProdutividade: number   // % adicional de velocidade diária ex: 20 = 20% mais rápido
  novaDataInicio: string | null  // ISO date string ou null (sem mudança)
  recursoExtra: number         // trabalhadores adicionais (impacto visual)
}

type ResultadoCenario = {
  conclusaoOriginal: Date
  conclusaoSimulada: Date
  deltaDias: number
  progressoSimulado: number
  ganhoSemanal: number  // % de progresso ganho por semana
}

interface Props {
  atividades: Atividade[]
  onClose?: () => void
  onAplicar?: (cenario: Cenario) => void
}

const CENARIOS_PRESET: Cenario[] = [
  {
    label: 'Turno Extra (+30% velocidade)',
    boostProdutividade: 30,
    novaDataInicio: null,
    recursoExtra: 8,
  },
  {
    label: 'Reforço de Equipe (+50%)',
    boostProdutividade: 50,
    novaDataInicio: null,
    recursoExtra: 15,
  },
  {
    label: 'Reprogramação de Início',
    boostProdutividade: 0,
    novaDataInicio: new Date().toISOString().slice(0, 10),
    recursoExtra: 0,
  },
]

function safeTs(val: string | null | undefined): number | null {
  if (!val) return null
  const t = new Date(val).getTime()
  return isNaN(t) ? null : t
}

function calcularResultado(atividades: Atividade[], cenario: Cenario): ResultadoCenario | null {
  if (atividades.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endTimestamps = atividades.map(a => safeTs(a.endDate)).filter((t): t is number => t !== null)
  const startTimestamps = atividades.map(a => safeTs(a.startDate)).filter((t): t is number => t !== null)
  if (endTimestamps.length === 0 || startTimestamps.length === 0) return null

  const endObra = new Date(Math.max(...endTimestamps))
  const startObra = new Date(Math.min(...startTimestamps))

  const totalWeight = atividades.reduce((s, a) => s + (a.weight || 1), 0)
  const currentProgress = atividades.reduce((s, a) => s + (a.progress * (a.weight || 1)), 0) / totalWeight

  const diasPassados = Math.max(1, (today.getTime() - startObra.getTime()) / 86400000)
  const velocidadeBase = currentProgress / diasPassados // % por dia

  const velocidadeSimulada = velocidadeBase * (1 + cenario.boostProdutividade / 100)

  const progressoRestante = 100 - currentProgress
  const diasRestantesOriginais = velocidadeBase > 0 ? progressoRestante / velocidadeBase : 999
  const diasRestantesSimulados = velocidadeSimulada > 0 ? progressoRestante / velocidadeSimulada : 999

  const conclusaoOriginal = new Date(today.getTime() + diasRestantesOriginais * 86400000)
  const conclusaoSimulada = new Date(today.getTime() + diasRestantesSimulados * 86400000)

  // Se mudou data de início, projeta novo start
  if (cenario.novaDataInicio) {
    const novoStart = new Date(cenario.novaDataInicio)
    const offsetDias = (novoStart.getTime() - startObra.getTime()) / 86400000
    conclusaoSimulada.setTime(conclusaoSimulada.getTime() + offsetDias * 86400000)
  }

  const deltaDias = Math.round((conclusaoOriginal.getTime() - conclusaoSimulada.getTime()) / 86400000)
  const ganhoSemanal = parseFloat((velocidadeSimulada * 7 - velocidadeBase * 7).toFixed(1))
  const progressoSimulado = Math.min(100, currentProgress + (velocidadeSimulada - velocidadeBase) * 30)

  return {
    conclusaoOriginal,
    conclusaoSimulada,
    deltaDias,
    progressoSimulado: Math.round(progressoSimulado),
    ganhoSemanal,
  }
}

function DeltaBadge({ dias }: { dias: number }) {
  if (dias === 0) return <span className="text-slate-400 text-xs font-bold">Sem impacto</span>
  const isGain = dias > 0
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${isGain ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isGain ? `-${dias}d` : `+${Math.abs(dias)}d`}
    </span>
  )
}

function TimelineBar({ original, simulada }: { original: Date; simulada: Date }) {
  const today = new Date()
  const isGain = simulada < original
  const totalSpan = Math.max(1, (original.getTime() - today.getTime()) / 86400000)
  const simuladaSpan = Math.max(0, (simulada.getTime() - today.getTime()) / 86400000)
  const pctSimulada = Math.min(100, Math.max(5, (simuladaSpan / totalSpan) * 100))

  return (
    <div className="space-y-3 mt-6">
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Hoje</span>
          <span>Conclusão Original</span>
        </div>
        <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-slate-300 rounded-full" style={{ width: '100%' }} />
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${isGain ? 'bg-emerald-400' : 'bg-red-400'}`}
            style={{ width: `${pctSimulada}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-end pr-3">
            <span className="text-[9px] font-black text-white/80 uppercase tracking-wider">
              {simulada.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
        <span className="text-slate-600 font-bold">{original.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

export default function WhatIfSimulator({ atividades, onClose, onAplicar }: Props) {
  const [boost, setBoost] = useState(0)
  const [novaData, setNovaData] = useState('')
  const [recursoExtra, setRecursoExtra] = useState(0)
  const [presetAberto, setPresetAberto] = useState(false)
  const [aplicado, setAplicado] = useState(false)

  const cenario: Cenario = {
    label: 'Cenário Personalizado',
    boostProdutividade: boost,
    novaDataInicio: novaData || null,
    recursoExtra,
  }

  const resultado = useMemo(() => calcularResultado(atividades, cenario), [atividades, boost, novaData, recursoExtra])

  const aplicarPreset = useCallback((p: Cenario) => {
    setBoost(p.boostProdutividade)
    setNovaData(p.novaDataInicio || '')
    setRecursoExtra(p.recursoExtra)
    setPresetAberto(false)
  }, [])

  const resetar = () => {
    setBoost(0)
    setNovaData('')
    setRecursoExtra(0)
    setAplicado(false)
  }

  const confirmar = () => {
    if (onAplicar) onAplicar(cenario)
    setAplicado(true)
  }

  const isModificado = boost !== 0 || novaData !== '' || recursoExtra !== 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-slate-900 px-10 py-8 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px] -mr-20 -mt-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <Sliders className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulador What-If</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Simule Cenários de Impacto</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Ajuste os parâmetros e veja o impacto no cronograma em tempo real.</p>
          </div>
          <button onClick={onClose} className="relative z-10 w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-10 space-y-8">

          {/* Presets */}
          <div className="relative">
            <button
              onClick={() => setPresetAberto(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:border-blue-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Usar cenário pré-definido
              </span>
              {presetAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {presetAberto && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 overflow-hidden">
                {CENARIOS_PRESET.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => aplicarPreset(p)}
                    className="w-full px-6 py-4 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-100 last:border-0 flex items-center gap-3"
                  >
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Boost de Produtividade</label>
                <span className={`text-lg font-black tabular-nums ${boost > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>+{boost}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={boost}
                onChange={e => setBoost(Number(e.target.value))}
                className="w-full h-2 appearance-none bg-slate-200 rounded-full cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5">
                <span>Sem alteração</span><span>+100% (Dobro)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recurso Extra (Trabalhadores)</label>
                <span className={`text-lg font-black tabular-nums ${recursoExtra > 0 ? 'text-blue-600' : 'text-slate-800'}`}>+{recursoExtra}</span>
              </div>
              <input
                type="range" min={0} max={50} step={1} value={recursoExtra}
                onChange={e => setRecursoExtra(Number(e.target.value))}
                className="w-full h-2 appearance-none bg-slate-200 rounded-full cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5">
                <span>0 pessoas</span><span>+50 pessoas</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Reprogramar Data de Início</label>
              <input
                type="date"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Resultado */}
          {resultado && isModificado && (
            <div className={`rounded-[2rem] p-8 border-2 transition-all duration-500 ${resultado.deltaDias > 0 ? 'bg-emerald-50 border-emerald-200' : resultado.deltaDias < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Resultado da Simulação</h4>
                <DeltaBadge dias={resultado.deltaDias} />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conclusão Atual</p>
                  <p className="text-sm font-black text-slate-700">{resultado.conclusaoOriginal.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className={`w-5 h-5 ${resultado.deltaDias > 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nova Projeção</p>
                  <p className={`text-sm font-black ${resultado.deltaDias > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{resultado.conclusaoSimulada.toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <TimelineBar original={resultado.conclusaoOriginal} simulada={resultado.conclusaoSimulada} />

              {resultado.ganhoSemanal > 0 && (
                <p className="mt-5 text-[10px] font-bold text-slate-500 text-center">
                  Ganho estimado de <span className="font-black text-emerald-700">{resultado.ganhoSemanal}% de avanço/semana</span> com este cenário.
                </p>
              )}
            </div>
          )}

          {!isModificado && (
            <div className="bg-slate-50 rounded-[2rem] p-8 text-center border border-dashed border-slate-200">
              <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajuste os parâmetros acima para ver o impacto projetado no prazo.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={resetar}
              className="px-6 py-4 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Resetar
            </button>
            <button
              onClick={confirmar}
              disabled={!isModificado || aplicado}
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${aplicado ? 'bg-emerald-500 text-white' : isModificado ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {aplicado ? <><CheckCircle2 className="w-4 h-4" /> Cenário Registrado</> : <><Play className="w-4 h-4" /> Registrar Cenário</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
