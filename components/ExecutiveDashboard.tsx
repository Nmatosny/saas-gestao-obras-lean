'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Clock, DollarSign, Target, Zap, Calendar, Shield, RefreshCw,
  Download, Share2, Lock
} from 'lucide-react'

type FinanceiroData = {
  bac: number; ev: number; pv: number; ac: number
  spi: number; cpi: number; eac: number; vac: number
  desvioFinanceiro: number; desvioFinanceiroPercent: number
  porServico: { name: string; color: string; bac: number; ev: number; progresso: number }[]
  alertas: { tipo: 'critico' | 'atencao' | 'ok'; mensagem: string }[]
}

type ForecastData = {
  conclusaoPlanejada: string | null
  conclusaoProjetada: string | null
  deltasDias: number
  porServico: { name: string; color: string; progresso: number; planned: string; projetada: string | null; delta: number }[]
}

type CurvaSPoint = { name: string; planejado: number; realizado: number | null }

type Props = {
  obraId: string
  obra: { nome: string; engenheiro?: string; endereco?: string }
  onSalvarBaseline: () => Promise<void>
  hasBaseline: boolean
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

function KpiCard({
  label, value, sub, trend, color
}: {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  color: 'green' | 'red' | 'yellow' | 'blue' | 'slate'
}) {
  const colors = {
    green: { bg: 'bg-white border-slate-100', val: 'text-emerald-600', icon: 'text-emerald-500', bar: 'bg-emerald-500' },
    red: { bg: 'bg-white border-slate-100', val: 'text-red-600', icon: 'text-red-500', bar: 'bg-red-500' },
    yellow: { bg: 'bg-white border-slate-100', val: 'text-amber-600', icon: 'text-amber-500', bar: 'bg-amber-500' },
    blue: { bg: 'bg-white border-slate-100', val: 'text-blue-600', icon: 'text-blue-500', bar: 'bg-blue-500' },
    slate: { bg: 'bg-white border-slate-100', val: 'text-slate-700', icon: 'text-slate-400', bar: 'bg-slate-400' },
  }
  const c = colors[color]
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className={`rounded-2xl p-8 border ${c.bg} shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] group hover:border-slate-200 transition-all`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${c.bar}`} />
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</p>
        <div className={`p-2 rounded-lg ${color === 'green' ? 'bg-emerald-50' : color === 'red' ? 'bg-red-50' : 'bg-slate-50'}`}>
           <TrendIcon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <div>
        <p className={`text-4xl font-black tracking-tight ${c.val}`}>{value}</p>
        {sub && <p className="text-[10px] font-bold text-slate-400 mt-2">{sub}</p>}
      </div>
    </div>
  )
}


export default function ExecutiveDashboard({ obraId, obra, onSalvarBaseline, hasBaseline }: Props) {
  const [financeiro, setFinanceiro] = useState<FinanceiroData | null>(null)
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [curvaS, setCurvaS] = useState<CurvaSPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoBaseline, setSalvandoBaseline] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [fin, fc, cs] = await Promise.all([
        fetch(`/api/obras/${obraId}/stats/financeiro`).then(r => r.json()),
        fetch(`/api/obras/${obraId}/stats/forecast`).then(r => r.json()),
        fetch(`/api/obras/${obraId}/stats/curva-s`).then(r => r.json()),
      ])
      if (fin.bac !== undefined) setFinanceiro(fin)
      if (fc.conclusaoPlanejada !== undefined) setForecast(fc)
      if (Array.isArray(cs)) setCurvaS(cs)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [obraId])

  useEffect(() => { carregar() }, [carregar])

  async function handleBaseline() {
    setSalvandoBaseline(true)
    await onSalvarBaseline()
    setSalvandoBaseline(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-80">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const delayed = forecast && forecast.deltasDias > 0
  const overBudget = financeiro && financeiro.vac < 0
  const spi = financeiro?.spi ?? 1
  const spiColor = spi >= 0.95 ? 'green' : spi >= 0.85 ? 'yellow' : 'red'
  const prazoColor = !delayed ? 'green' : (forecast?.deltasDias ?? 0) > 14 ? 'red' : 'yellow'
  const finColor = !overBudget ? 'green' : 'red'

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-10 pb-24">

      {/* Cabeçalho executivo */}
      <div className="bg-slate-900 rounded-2xl p-10 flex flex-col md:flex-row items-start justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Relatório Flash Executivo</p>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">{obra.nome}</h1>
          <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-400">
            {obra.engenheiro && <span>{obra.engenheiro}</span>}
            {obra.endereco && <span className="border-l border-slate-700/50 pl-4">{obra.endereco}</span>}
            <span className="border-l border-slate-700/50 pl-4 capitalize">{today}</span>
          </div>
        </div>
        <div className="flex gap-3 relative z-10 flex-wrap">
          <button
            onClick={handleBaseline}
            disabled={salvandoBaseline}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              hasBaseline
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            {salvandoBaseline
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Lock className="w-4 h-4" />}
            {hasBaseline ? 'Baseline Ativa' : 'Congelar Baseline'}
          </button>
          <button onClick={carregar} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors border border-white/10">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Os 3 KPIs Principais — "Decisão de Director" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Desvio de Prazo"
          value={delayed ? `+${forecast!.deltasDias}d` : forecast?.deltasDias === 0 ? 'No prazo' : `${forecast?.deltasDias ?? 0}d adiantado`}
          sub={`Estimativa de Término: ${fmtDate(forecast?.conclusaoProjetada ?? null)}`}
          trend={delayed ? 'down' : 'up'}
          color={prazoColor}
        />
        <KpiCard
          label="Avanço Financeiro (EV-PV)"
          value={financeiro ? fmtBRL(financeiro.desvioFinanceiro) : '—'}
          sub={`Variação Final (VAC): ${financeiro ? fmtBRL(financeiro.vac) : '—'}`}
          trend={overBudget ? 'down' : 'up'}
          color={finColor}
        />
        <KpiCard
          label="Performance de Prazo (SPI)"
          value={financeiro ? financeiro.spi.toFixed(3) : '—'}
          sub={spi < 0.95 ? 'Ritmo abaixo do planejado' : 'Eficiência de produção ok'}
          trend={spi >= 0.95 ? 'up' : spi >= 0.85 ? 'neutral' : 'down'}
          color={spiColor}
        />
      </div>


      {/* KPIs Financeiros detalhados */}
      {financeiro && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
               <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Análise de Valor Agregado (EVA)</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Controladoria & Engenharia de Custos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'BAC (Orçamento Base)', value: fmtBRL(financeiro.bac), sub: 'Total da Obra', icon: Target, color: 'text-slate-600' },
              { label: 'PV (Previsto no Plano)', value: fmtBRL(financeiro.pv), sub: 'Meta de Entrega Acumulada', icon: Calendar, color: 'text-blue-600' },
              { label: 'EV (Avanço Agregado)', value: fmtBRL(financeiro.ev), sub: 'Medição Efetiva', icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'EAC (Custo Estimado)', value: fmtBRL(financeiro.eac), sub: `VAC: ${fmtBRL(financeiro.vac)}`, icon: TrendingUp, color: financeiro.vac < 0 ? 'text-red-600' : 'text-emerald-600' },
            ].map((k, i) => (
              <div key={i} className="bg-slate-50/50 rounded-xl p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
                </div>
                <p className={`text-xl font-black tracking-tight ${k.color}`}>{k.value}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Por serviço */}
          {financeiro.porServico.length > 0 && (
            <div className="pt-8 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Zap className="w-3 h-3" /> Avanço por Categoria de Serviço
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {financeiro.porServico.sort((a, b) => b.bac - a.bac).map((s, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                       <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
                       <span className="text-[10px] font-black text-slate-400">{s.progresso}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 shadow-sm" style={{ width: `${s.progresso}%`, background: s.color }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                       <span>{fmtBRL(s.ev)} realizados</span>
                       <span>Meta: {fmtBRL(s.bac)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* PPC History & Pareto CNC */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
         
         {/* Gráfico de PPC (Confiabilidade) */}
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                     <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-800 tracking-tight">Confiabilidade (PPC)</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Histórico Semanal de Cumprimento</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-black text-blue-600">82%</p>
                  <p className="text-[9px] font-black text-slate-300 uppercase">Média Geral</p>
               </div>
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Sem 14', ppc: 75 },
                    { name: 'Sem 15', ppc: 80 },
                    { name: 'Sem 16', ppc: 65 },
                    { name: 'Sem 17', ppc: 90 },
                    { name: 'Sem 18', ppc: 85 },
                    { name: 'Sem 19', ppc: 82 },
                  ]}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} unit="%" />
                     <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     />
                     <Bar dataKey="ppc" radius={[4, 4, 0, 0]} barSize={40}>
                        {[75, 80, 65, 90, 85, 82].map((v, i) => (
                           <Cell key={i} fill={v >= 80 ? '#10b981' : v >= 70 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Pareto de CNC */}
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Causas de Não Cumprimento</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">O que está travando a obra?</p>
               </div>
            </div>

            <div className="space-y-6">
               {[
                 { causa: 'Mão de Obra', qtd: 12, color: '#3b82f6' },
                 { causa: 'Material', qtd: 8, color: '#10b981' },
                 { causa: 'Clima', qtd: 5, color: '#f59e0b' },
                 { causa: 'Projeto', qtd: 3, color: '#ef4444' },
               ].map((item, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.causa}</span>
                       <span className="text-[11px] font-black text-slate-400">{item.qtd} ocorrências</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                       <div className="h-full rounded-full" style={{ width: `${(item.qtd / 28) * 100}%`, backgroundColor: item.color }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

      </div>

      {/* Curva S de Avanço */}
      {curvaS.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Curva S de Avanço</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Físico Planejado vs. Físico Realizado</p>
             </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curvaS} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gpExec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grExec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => v != null ? `${v}%` : '—'} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 11, fontWeight: 700 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="planejado" name="Planejado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" fill="url(#gpExec)" dot={false} />
                <Area type="monotone" dataKey="realizado" name="Realizado" stroke="#3b82f6" strokeWidth={2.5} fill="url(#grExec)" dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alertas Críticos */}
      {financeiro && financeiro.alertas.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-10 relative overflow-hidden shadow-xl shadow-slate-900/10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] -ml-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Análise de Restrições</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alertas de Médio e Curto Prazo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {financeiro.alertas.map((a, i) => {
                const styles = {
                  critico: { border: 'border-red-500/20 bg-red-500/5', dot: 'bg-red-500', text: 'text-red-200', badge: 'bg-red-500/20 text-red-400' },
                  atencao: { border: 'border-amber-500/20 bg-amber-500/5', dot: 'bg-amber-500', text: 'text-amber-200', badge: 'bg-amber-500/20 text-amber-400' },
                  ok: { border: 'border-emerald-500/20 bg-emerald-500/5', dot: 'bg-emerald-500', text: 'text-emerald-200', badge: 'bg-emerald-500/20 text-emerald-400' },
                }
                const s = styles[a.tipo]
                return (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${s.border}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <p className={`text-xs font-semibold ${s.text} flex-1`}>{a.mensagem}</p>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0 ${s.badge}`}>
                      {a.tipo === 'critico' ? 'Urgente' : a.tipo === 'atencao' ? 'Atenção' : 'OK'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}


      {/* Por serviço — forecast resumo */}
      {forecast && forecast.porServico.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
               <Clock className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Projeção por Atividade</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Forecast Individual de Produção</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {forecast.porServico.map((s, i) => (
              <div key={i} className={`rounded-xl p-5 border transition-all ${
                s.delta > 7 ? 'bg-red-50/30 border-red-100' : s.delta > 0 ? 'bg-amber-50/30 border-amber-100' : 'bg-emerald-50/30 border-emerald-100'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[11px] font-black text-slate-700 truncate flex-1 uppercase tracking-tight">{s.name}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    s.delta > 7 ? 'bg-red-100 text-red-600' : s.delta > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {s.delta > 0 ? `+${s.delta}d` : s.delta < 0 ? `${s.delta}d` : 'OK'}
                  </span>
                </div>
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${s.progresso}%`, background: s.color }} />
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{s.progresso}% Avanço</span>
                  <span>Entrega: {fmtDate(s.projetada)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
