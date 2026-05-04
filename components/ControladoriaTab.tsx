'use client'

import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend, Area, AreaChart
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Calendar, Clock, Zap, ArrowRight } from 'lucide-react'

type CurvaSPoint = { name: string; planejado: number; realizado: number | null; pv: number; ev: number | null; ac: number | null; }

// ... existing types
type CncData = { causa: string; count: number; percentual: number }
type ForecastServico = { name: string; color: string; progresso: number; planned: string; projetada: string | null; delta: number }
type ForecastData = {
  conclusaoPlanejada: string | null
  conclusaoProjetada: string | null
  deltasDias: number
  porServico: ForecastServico[]
}
type Dependencia = {
  id: string
  servicoPredecessorId: string
  servicoSucessorId: string
  lagDias: number
  servicoPredecessor: { name: string; color: string }
  servicoSucessor: { name: string; color: string }
}

const COLORS_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ControladoriaTab({ obraId }: { obraId: string }) {
  const [curvaS, setCurvaS] = useState<CurvaSPoint[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [cnc, setCnc] = useState<{ total: number; data: CncData[] } | null>(null)
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [deps, setDeps] = useState<Dependencia[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'fisico' | 'financeiro'>('fisico')

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [cs, cn, fc, dp] = await Promise.all([
          fetch(`/api/obras/${obraId}/stats/curva-s`).then(r => r.json()),
          fetch(`/api/obras/${obraId}/stats/cnc`).then(r => r.json()),
          fetch(`/api/obras/${obraId}/stats/forecast`).then(r => r.json()),
          fetch(`/api/dependencias?obraId=${obraId}`).then(r => r.json()),
        ])
        if (cs?.pontos) {
          setCurvaS(cs.pontos)
          setTotalBudget(cs.totalBudget || 0)
        } else if (Array.isArray(cs)) {
          setCurvaS(cs)
        }
        if (cn?.data) setCnc(cn)
        if (fc?.conclusaoPlanejada !== undefined) setForecast(fc)
        if (Array.isArray(dp)) setDeps(dp)
      } catch (_e) {
        // Handle error
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [obraId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const delayed = forecast && forecast.deltasDias > 0

  return (
    <div className="space-y-10 pb-20">

      {/* Forecast Hero */}
      {forecast && (
        <div className={`rounded-2xl p-10 border relative overflow-hidden shadow-lg ${delayed ? 'bg-[#450A0A] border-red-900' : 'bg-[#0F172A] border-slate-800'}`}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] -mr-48 -mt-48" style={{ background: delayed ? '#7f1d1d40' : '#1e3a5f40' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              {delayed ? <TrendingDown className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-emerald-400" />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Projeção de Entrega (Forecast)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Data Planejada (Base)</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight">{fmt(forecast.conclusaoPlanejada)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Nova Estimativa Real</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10`}>
                    <Clock className={`w-5 h-5 ${delayed ? 'text-red-400' : 'text-emerald-400'}`} />
                  </div>
                  <p className={`text-2xl font-black tracking-tight ${delayed ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(forecast.conclusaoProjetada)}</p>
                </div>
              </div>
              <div className={`rounded-xl p-6 ${delayed ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Desvio Acumulado</p>
                <p className={`text-4xl font-black tracking-tighter ${delayed ? 'text-red-300' : 'text-emerald-300'}`}>
                   {delayed ? `+${forecast.deltasDias}d` : forecast.deltasDias < 0 ? `${forecast.deltasDias}d` : 'NO PRAZO'}
                </p>
                <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase">{delayed ? 'Atraso em relação à baseline' : 'Adiantamento detectado'}</p>
              </div>
            </div>

            {/* Por Serviço */}
            {forecast.porServico.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {forecast.porServico.map((s, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-[9px] font-black text-slate-400 uppercase truncate">{s.name}</span>
                    </div>
                    <div className="flex justify-between items-end mb-1">
                       <p className="text-base font-black text-white">{s.progresso}%</p>
                       <p className={`text-[9px] font-black ${s.delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {s.delta > 0 ? `+${s.delta}d` : s.delta < 0 ? `${s.delta}d` : 'OK'}
                       </p>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full rounded-full" style={{ width: `${s.progresso}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">

        {/* Curva S */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                 <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Curva S de Avanço</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {chartType === 'fisico' ? 'Planejado × Realizado Acumulado (%)' : 'Orçado × Agregado × Realizado (R$)'}
                </p>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setChartType('fisico')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${chartType === 'fisico' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Físico (%)
              </button>
              <button 
                onClick={() => setChartType('financeiro')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${chartType === 'financeiro' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Financeiro (R$)
              </button>
            </div>
          </div>

          {chartType === 'financeiro' && totalBudget > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Orçamento Total (BAC)</p>
                  <p className="text-lg font-black text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalBudget)}
                  </p>
               </div>
               <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valor Agregado Atual (EV)</p>
                  <p className="text-lg font-black text-emerald-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(curvaS[curvaS.length - 1]?.ev || 0)}
                  </p>
               </div>
               <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Custo Real (AC)</p>
                  <p className="text-lg font-black text-blue-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(curvaS[curvaS.length - 1]?.ac || 0)}
                  </p>
               </div>
            </div>
          )}

          {curvaS.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={curvaS} margin={{ top: 4, right: 4, left: chartType === 'financeiro' ? 20 : -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPlan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradEv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                
                {chartType === 'fisico' ? (
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                ) : (
                  <YAxis 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => `R$ ${(v / 1000)}k`} 
                  />
                )}

                <Tooltip 
                  formatter={(v: number | string) => {
                    if (v == null) return '—';
                    if (chartType === 'fisico') return `${v}%`;
                    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v));
                  }} 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} 
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 20 }} />
                
                {chartType === 'fisico' ? (
                  <>
                    <Area type="monotone" dataKey="planejado" name="Previsto (%)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradPlan)" dot={false} />
                    <Area type="monotone" dataKey="realizado" name="Avanço Real (%)" stroke="#3b82f6" strokeWidth={3} fill="url(#gradReal)" dot={false} connectNulls={false} />
                  </>
                ) : (
                  <>
                    <Area type="monotone" dataKey="pv" name="Orçado (PV)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradPlan)" dot={false} />
                    <Area type="monotone" dataKey="ev" name="Agregado (EV)" stroke="#10b981" strokeWidth={3} fill="url(#gradEv)" dot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="ac" name="Custo Real (AC)" stroke="#3b82f6" strokeWidth={2} fill="url(#gradReal)" dot={false} connectNulls={false} />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-300 font-black text-[10px] uppercase tracking-widest">Sem dados de medição</div>
          )}
        </div>


        {/* CNC PieChart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
               <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Restrições (CNC)</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Causas de Não Cumprimento</p>
            </div>
          </div>
          {cnc && cnc.data.length > 0 ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={cnc.data}
                    dataKey="count"
                    nameKey="causa"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={60}
                    paddingAngle={4}
                  >
                    {cnc.data.map((_, i) => (
                      <Cell key={i} fill={COLORS_PALETTE[i % COLORS_PALETTE.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | string, name: number | string) => [`${v} ocorrências`, name]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {cnc.data.slice(0, 5).map((d, i) => (
                  <div key={d.causa} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS_PALETTE[i % COLORS_PALETTE.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase mb-1.5">
                        <span className="truncate">{d.causa}</span>
                        <span>{d.percentual}%</span>
                      </div>
                      <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${d.percentual}%`, background: COLORS_PALETTE[i % COLORS_PALETTE.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-4 opacity-40">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                 <AlertTriangle className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum impedimento<br />detectado</p>
            </div>
          )}
        </div>

      </div>

      {/* PM Virtual — Ações Recomendadas */}
      <PMVirtual forecast={forecast} cnc={cnc} deps={deps} />
    </div>
  )
}

// ─── PM Virtual ───────────────────────────────────────────────────────────────

type PMVirtualProps = {
  forecast: ForecastData | null
  cnc: { total: number; data: CncData[] } | null
  deps: Dependencia[]
}

function PMVirtual({ forecast, cnc, deps }: PMVirtualProps) {
  // Generate actionable insights
  const insights: { icon: React.ReactNode; priority: 'high' | 'medium' | 'low'; title: string; body: string; action?: string }[] = []

  // 1. Delay alert
  if (forecast && forecast.deltasDias > 0) {
    insights.push({
      icon: <TrendingDown className="w-5 h-5 text-red-400" />,
      priority: 'high',
      title: `Atraso projetado de ${forecast.deltasDias} dia${forecast.deltasDias !== 1 ? 's' : ''}`,
      body: `A obra está atrasando em relação ao planejado. A nova data estimada de conclusão é ${fmt(forecast.conclusaoProjetada)}.`,
      action: 'Revisar cronograma e identificar caminho crítico.'
    })
  }

  // 2. Services in trouble
  if (forecast?.porServico) {
    forecast.porServico.filter(s => s.delta > 7).forEach(s => {
      insights.push({
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        priority: 'high',
        title: `${s.name}: +${s.delta} dias de atraso`,
        body: `Este serviço está com ${s.progresso}% de progresso e projeta um atraso de ${s.delta} dias.`,
        action: `Verificar equipe e recursos dedicados a "${s.name}".`
      })
    })
  }

  // 3. Top CNC cause recommendation
  if (cnc && cnc.data.length > 0) {
    const top = cnc.data[0]
    const suggestions: Record<string, string> = {
      'Material': 'Acionar fornecedor e verificar estoque de segurança.',
      'Mão de Obra': 'Avaliar subcontratação ou remanejamento de equipes de locais concluídos.',
      'Clima': 'Reorganizar atividades internas para os dias improdutivos.',
      'Equipamento': 'Verificar disponibilidade de equipamento reserva ou locação.',
      'Projeto': 'Convocar reunião com projetistas para resolução das pendências.',
      'Financeiro': 'Escalar para gestão: liberação de verba bloqueando execução.',
    }
    insights.push({
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      priority: 'medium',
      title: `Principal causa de atraso: ${top.causa} (${top.percentual}%)`,
      body: `${top.count} atividade${top.count !== 1 ? 's' : ''} ${top.count !== 1 ? 'foram impedidas' : 'foi impedida'} por "${top.causa}".`,
      action: suggestions[top.causa] || 'Investigar e remover a restrição.'
    })
  }

  // 4. Dependency chain warning
  if (deps.length > 0 && forecast?.porServico) {
    deps.forEach(dep => {
      const predSvc = forecast.porServico.find(s => s.name === dep.servicoPredecessor.name)
      const sucSvc = forecast.porServico.find(s => s.name === dep.servicoSucessor.name)
      if (predSvc && predSvc.delta > 0 && sucSvc) {
        insights.push({
          icon: <ArrowRight className="w-5 h-5 text-orange-400" />,
          priority: 'medium',
          title: `"${dep.servicoSucessor.name}" será impactado`,
          body: `O atraso em "${dep.servicoPredecessor.name}" vai empurrar o início de "${dep.servicoSucessor.name}" em pelo menos ${predSvc.delta + dep.lagDias} dia(s).`,
          action: `Sugestão: adiantar atividades de "${dep.servicoSucessor.name}" em locais onde "${dep.servicoPredecessor.name}" já concluiu.`
        })
      }
    })
  }

  // 5. Positive: on track services
  const onTrack = forecast?.porServico.filter(s => s.delta <= 0) || []
  if (onTrack.length > 0 && insights.length === 0) {
    insights.push({
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      priority: 'low',
      title: 'Obra dentro do prazo',
      body: `${onTrack.length} serviço${onTrack.length !== 1 ? 's estão' : ' está'} no prazo ou adiantado${onTrack.length !== 1 ? 's' : ''}.`,
      action: 'Manter o ritmo de produção atual.'
    })
  }

  if (insights.length === 0) return null

  return (
    <div className="bg-[#0F172A] rounded-2xl p-10 relative overflow-hidden shadow-xl shadow-slate-900/10">
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] -mr-40 -mt-40" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">PM Virtual</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inteligência Preditiva & Ações de Campo</p>
          </div>
          <span className="ml-auto text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            {insights.length} insight{insights.length !== 1 ? 's' : ''} detectado{insights.length !== 1 ? 's' : ''}
          </span>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, i) => {
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">{ins.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        ins.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        ins.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {ins.priority === 'high' ? 'Urgente' : ins.priority === 'medium' ? 'Atenção' : 'Info'}
                      </span>
                    </div>
                    <p className="text-sm font-black text-white leading-snug">{ins.title}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed mb-3">{ins.body}</p>
                {ins.isLagInfo && <p className="text-xs font-medium text-slate-500 italic mt-2">&quot;Lag&quot; é o tempo de espera entre o fim de uma atividade e o início da próxima.</p>}
                {ins.action && (
                  <div className="flex items-start gap-2 pt-3 border-t border-white/10">
                    <ArrowRight className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-blue-300 leading-relaxed">{ins.action}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}
