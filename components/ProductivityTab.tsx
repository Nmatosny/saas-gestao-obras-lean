'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, Users, Target, 
  ArrowDownRight, ArrowUpRight, Activity
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, LineChart, Line
} from 'recharts'

type ProdStat = {
  id: string
  name: string
  resource: string
  service: string
  location: string
  progress: number
  totalHours: number
  totalCost: number
  rup: number
  unitCost: number
  unit: string
}

export default function ProductivityTab({ obraId }: { obraId: string }) {
  const [stats, setStats] = useState<ProdStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/obras/${obraId}/stats/produtividade`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStats(data)
        setLoading(false)
      })
  }, [obraId])

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Calculando Produtividade...</div>

  const avgRup = stats.length > 0 ? (stats.reduce((acc, s) => acc + s.rup, 0) / stats.filter(s => s.rup > 0).length || 0).toFixed(2) : 0

  return (
    <div className="space-y-10">
      
      {/* KPIs de Produtividade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
           <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">RUP Média (Geral)</p>
           <h3 className="text-4xl font-black mb-1">{avgRup}</h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hh / Unidade</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
           <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Horas</p>
           <h4 className="text-3xl font-black text-slate-800">{stats.reduce((acc, s) => acc + s.totalHours, 0).toLocaleString()} <span className="text-xs text-slate-300">Hh</span></h4>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-blue-600" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipes Ativas</p>
           <h4 className="text-3xl font-black text-slate-800">{new Set(stats.map(s => s.resource)).size}</h4>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
           <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-amber-500" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Real (Equipe)</p>
           <h4 className="text-3xl font-black text-slate-800">
             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.reduce((acc, s) => acc + s.totalCost, 0))}
           </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking de Produtividade (RUP) */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <Activity className="w-4 h-4 text-blue-600" /> Ranking de RUP por Serviço
              </h3>
           </div>
           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.filter(s => s.rup > 0).sort((a,b) => b.rup - a.rup)}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 20, border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="rup" radius={[6, 6, 0, 0]} barSize={32}>
                       {stats.map((d, i) => (
                          <Cell key={i} fill={d.rup < 1.0 ? '#10b981' : d.rup < 2.5 ? '#3b82f6' : '#f59e0b'} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase text-center italic">Quanto menor a RUP, maior a produtividade da equipe.</p>
        </div>

        {/* Detalhamento por Recurso */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10">Performance por Responsável</h3>
           <div className="space-y-4">
              {stats.map(s => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 font-black text-blue-600 text-xs">
                         {s.resource.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-800">{s.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{s.resource}</p>
                      </div>
                   </div>
                   <div className="text-right">
                       <p className="text-xs font-black text-slate-800">{s.rup} <span className="text-[9px] text-slate-400">Hh/{s.unit}</span></p>
                       <p className="text-[10px] font-bold text-slate-400">R$ {s.unitCost}/{s.unit}</p>
                       <div className="flex items-center gap-1 justify-end mt-1">
                         {s.rup < 1.5 ? <ArrowDownRight className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-amber-500" />}
                         <span className={`text-[9px] font-black uppercase ${s.rup < 1.5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {s.rup < 1.5 ? 'Alta Eficiência' : 'Abaixo da Meta'}
                         </span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}
