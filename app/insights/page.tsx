'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, 
  Building2, ArrowUpRight, Search, Filter 
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts'

const WORKSPACE_ID = 'workspace-1'

export default function InsightsPage() {
  const [obras, setObras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/obras?workspaceId=${WORKSPACE_ID}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setObras(data)
        } else {
          setObras([])
        }
        setLoading(false)
      })
      .catch(() => {
        setObras([])
        setLoading(false)
      })
  }, [])

  const stats = {
    totalObras: obras.length,
    concluidas: obras.filter(o => o.stats?.status === 'Concluída').length,
    emAndamento: obras.filter(o => o.stats?.status !== 'Concluída').length,
    atrasadas: obras.filter(o => o.stats?.status === 'Crítico').length,
    ppcMedio: obras.length > 0 ? Math.round(obras.reduce((acc, o) => acc + (o.stats?.progresso || 0), 0) / obras.length) : 0
  }

  const chartData = useMemo(() => {
    if (obras.length === 0) return [
      { name: 'Sem Obras', ppc: 0, desvio: 0 }
    ]
    return obras.map(o => ({
      name: o.nome,
      ppc: o.stats?.progresso || 0,
      desvio: o.stats?.desvio || 0
    }))
  }, [obras])

  return (
    <div className="p-12">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Engenharia Consultiva</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Análise de Avanço (Portfólio)</h1>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input placeholder="Buscar obra..." className="bg-transparent border-none text-sm font-bold outline-none" />
           </div>
           <button className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-slate-500 hover:text-blue-600">
              <Filter className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
         <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PPC Médio (Global)</p>
            <div className="flex items-end gap-2">
               <h2 className="text-3xl font-black text-slate-800">{stats.ppcMedio}%</h2>
               <span className="text-emerald-500 text-[10px] font-black mb-1.5">+2.4%</span>
            </div>
         </div>
         <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Obras Ativas</p>
            <h2 className="text-3xl font-black text-slate-800">{stats.emAndamento}</h2>
         </div>
         <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertas Críticos</p>
            <h2 className="text-3xl font-black text-red-500">{stats.atrasadas}</h2>
         </div>
         <div className="bg-slate-900 p-8 rounded-2xl shadow-xl shadow-slate-900/10 text-white">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Valor do Portfólio</p>
            <h2 className="text-2xl font-black">R$ 12.4M</h2>
         </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
         
         {/* Ranking de Performance */}
         <div className="lg:col-span-2 bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Comparativo de Performance (PPC)
               </h3>
            </div>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                     <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }} />
                     <Bar dataKey="ppc" radius={[0, 4, 4, 0]} barSize={24}>
                        {chartData.map((d, i) => (
                           <Cell key={i} fill={d.ppc >= 90 ? '#10b981' : d.ppc >= 80 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Distribuição de Desvios */}
         <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 text-amber-500" /> Saúde do Cronograma
            </h3>
            <div className="flex-1 flex flex-col justify-center gap-6">
               {chartData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-600">{d.name}</span>
                     <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${d.desvio < 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                           {d.desvio > 0 ? `+${d.desvio}` : d.desvio} dias
                        </span>
                     </div>
                  </div>
               ))}
            </div>
            <button className="mt-8 w-full bg-slate-50 text-slate-400 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all">
               Ver Relatório Consolidado
            </button>
         </div>

      </div>

    </div>
  )
}
