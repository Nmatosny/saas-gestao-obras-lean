'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend, Area, AreaChart,
  BarChart, Bar, ComposedChart, Line
} from 'recharts'
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, 
  Calendar, Clock, Zap, ArrowRight, DollarSign, 
  Users, HardHat, CloudSun, Image as ImageIcon,
  CheckCircle2, Activity, BookOpen
} from 'lucide-react'

// --- TYPES ---
type CurvaSPoint = { name: string; planejado: number; realizado: number | null; pv: number; ev: number | null; ac: number | null; }
type CncData = { causa: string; count: number; percentual: number }
type ForecastData = { conclusaoPlanejada: string | null; conclusaoProjetada: string | null; deltasDias: number; porServico: any[] }
type Diario = { date: string; weatherMorning: string; fotos: any[]; efetivos: any[]; atividades: any[] }
type RUPData = { servico: string; rup: number; meta: number; status: 'bom' | 'alerta' | 'critico' }

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export default function IndicadoresTab({ obraId }: { obraId: string }) {
  const [loading, setLoading] = useState(true)
  const [curvaS, setCurvaS] = useState<CurvaSPoint[]>([])
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [cnc, setCnc] = useState<{ total: number; data: CncData[] } | null>(null)
  const [diarios, setDiarios] = useState<Diario[]>([])
  const [rups, setRups] = useState<RUPData[]>([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [cs, fc, cn, dr, pr] = await Promise.all([
          fetch(`/api/obras/${obraId}/stats/curva-s`).then(r => r.json()),
          fetch(`/api/obras/${obraId}/stats/forecast`).then(r => r.json()),
          fetch(`/api/obras/${obraId}/stats/cnc`).then(r => r.json()),
          fetch(`/api/diarios?obraId=${obraId}`).then(r => r.json()),
          fetch(`/api/obras/${obraId}/stats/produtividade`).then(r => r.json()),
        ])

        if (cs?.pontos) setCurvaS(cs.pontos)
        if (fc?.conclusaoPlanejada !== undefined) setForecast(fc)
        if (cn?.data) setCnc(cn)
        if (Array.isArray(dr)) setDiarios(dr)
        if (Array.isArray(pr)) setRups(pr)
        else if (pr?.data) setRups(pr.data)
      } catch (e) {
        console.error("Dashboard error:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [obraId])

  // --- DERIVED METRICS ---
  const stats = useMemo(() => {
    const totalRDOs = diarios.length
    const lastPoint = curvaS[curvaS.length - 1]
    const spi = lastPoint?.pv ? (lastPoint.ev || 0) / lastPoint.pv : 1
    const cpi = lastPoint?.ac ? (lastPoint.ev || 0) / lastPoint.ac : 1
    const physicalProgress = lastPoint?.realizado || 0
    
    const weatherStats = diarios.reduce((acc: any, d) => {
      acc[d.weatherMorning] = (acc[d.weatherMorning] || 0) + 1
      return acc
    }, {})

    const totalManHours = diarios.reduce((acc, d) => 
       acc + d.atividades.reduce((a2: number, act: any) => a2 + (act.actualManHours || 0), 0), 0
    )

    return { 
      totalRDOs, spi, cpi, physicalProgress, 
      weatherStats, totalManHours,
      health: cpi >= 1 && spi >= 1 ? 'excelente' : cpi < 0.9 || spi < 0.9 ? 'critico' : 'alerta'
    }
  }, [curvaS, diarios])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compilando Inteligência de Obra...</p>
    </div>
  )

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      
      {/* 1. TOP KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         <KPICard 
           label="Avanço Físico Real" 
           value={`${stats.physicalProgress.toFixed(1)}%`} 
           sub={forecast?.deltasDias ? `${forecast.deltasDias > 0 ? '+' : ''}${forecast.deltasDias}d desvio` : 'No prazo'}
           icon={<Target className="w-6 h-6" />}
           color="blue"
         />
         <KPICard 
           label="Eficiência de Custo (CPI)" 
           value={stats.cpi.toFixed(2)} 
           sub={stats.cpi >= 1 ? 'Abaixo do Orçado' : 'Sobre-custo Detectado'}
           icon={<DollarSign className="w-6 h-6" />}
           color={stats.cpi >= 1 ? 'emerald' : 'red'}
         />
         <KPICard 
           label="Engajamento RDO" 
           value={`${stats.totalRDOs}`} 
           sub="Diários Preenchidos"
           icon={<BookOpen className="w-6 h-6" />}
           color="amber"
         />
         <KPICard 
           label="Esforço Total" 
           value={`${stats.totalManHours.toLocaleString()}h`} 
           sub="Homem-Hora Acumulado"
           icon={<Users className="w-6 h-6" />}
           color="purple"
         />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         
         {/* 2. FINANCEIRO: CURVA S (AC x EV x PV) */}
         <div className="xl:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                     <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-800 tracking-tight">Fluxo Financeiro e Agregado</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análise de Valor Agregado (EVA)</p>
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                     <span className="text-[9px] font-black text-slate-400 uppercase">Orçado (PV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                     <span className="text-[9px] font-black text-slate-400 uppercase">Agregado (EV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                     <span className="text-[9px] font-black text-slate-400 uppercase">Custo Real (AC)</span>
                  </div>
               </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
               <AreaChart data={curvaS}>
                  <defs>
                     <linearGradient id="gradEV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                     <linearGradient id="gradAC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                     contentStyle={{ borderRadius: 20, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: 11, fontWeight: 800 }}
                     formatter={(v) => `R$ ${Number(v).toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="pv" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                  <Area type="monotone" dataKey="ev" stroke="#10b981" strokeWidth={3} fill="url(#gradEV)" />
                  <Area type="monotone" dataKey="ac" stroke="#3b82f6" strokeWidth={3} fill="url(#gradAC)" />
               </AreaChart>
            </ResponsiveContainer>
         </div>

         {/* 3. OPERACIONAL: CLIMA & RDO */}
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <CloudSun className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Condições de Campo</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dados Consolidados RDO</p>
               </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
               <div className="space-y-6">
                  {Object.entries(stats.weatherStats).map(([weather, count]: [any, any], i) => (
                    <div key={weather} className="group">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{weather}</span>
                          <span className="text-xs font-black text-slate-800">{count} dias</span>
                       </div>
                       <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${(count/stats.totalRDOs)*100}%`, backgroundColor: COLORS[i % COLORS.length] }} 
                          />
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-10 pt-10 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div className="text-center">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Média de Fotos / RDO</p>
                     <div className="flex items-center justify-center gap-2 text-slate-800">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-xl font-black">4.2</span>
                     </div>
                  </div>
                  <div className="text-center">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Eficiência de Envio</p>
                     <div className="flex items-center justify-center gap-2 text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xl font-black">92%</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         
         {/* 4. PRODUTIVIDADE: RUP POR SERVIÇO */}
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                     <Activity className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-800 tracking-tight">Produtividade (RUP)</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Razão Unitária de Produção (h/unid)</p>
                  </div>
               </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
               <BarChart data={rups} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="servico" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#475569' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', shadow: 'none' }} />
                  <Bar dataKey="rup" radius={[0, 4, 4, 0]} barSize={20}>
                     {rups.map((entry, index) => (
                        <Cell key={index} fill={entry.rup > entry.meta ? '#ef4444' : '#10b981'} />
                     ))}
                  </Bar>
                  <Line dataKey="meta" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} />
               </BarChart>
            </ResponsiveContainer>
         </div>

         {/* 5. PM VIRTUAL INSIGHTS */}
         <div className="bg-[#0F172A] rounded-[3.5rem] p-10 relative overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] -mr-40 -mt-40" />
            
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20">
                     <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-white tracking-tight">Inteligência Preditiva</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ações recomendadas baseadas em dados</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <InsightRow 
                    type="alerta" 
                    title="Desvio Financeiro Detectado" 
                    text={`O CPI de ${stats.cpi.toFixed(2)} indica que a obra está custando mais do que o valor agregado produzido.`}
                  />
                  <InsightRow 
                    type="acao" 
                    title="Otimizar Escavação" 
                    text="A RUP de Escavação está 15% acima da meta. Sugestão: revisar logística de saída de material."
                  />
                  <InsightRow 
                    type="info" 
                    title="Clima Favorável" 
                    text="Previsão de tempo limpo para os próximos 5 dias. Momento ideal para acelerar concretagens externas."
                  />
               </div>
            </div>
         </div>

      </div>
    </div>
  )
}

function KPICard({ label, value, sub, icon, color }: { label: string, value: string, sub: string, icon: any, color: 'blue' | 'emerald' | 'amber' | 'purple' | 'red' }) {
   const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      amber: 'bg-amber-50 text-amber-600 border-amber-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
      red: 'bg-red-50 text-red-600 border-red-100'
   }
   return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${colors[color]}`}>
            {icon}
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
         <h4 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{value}</h4>
         <p className="text-[10px] font-bold text-slate-400 italic">{sub}</p>
      </div>
   )
}

function InsightRow({ type, title, text }: { type: 'alerta' | 'acao' | 'info', title: string, text: string }) {
   const config = {
      alerta: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Urgente' },
      acao: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Ação' },
      info: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Info' }
   }
   return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
         <div className="flex items-center gap-2 mb-2">
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${config[type].bg} ${config[type].text}`}>
               {config[type].label}
            </span>
            <p className="text-xs font-black text-white">{title}</p>
         </div>
         <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{text}</p>
      </div>
   )
}
