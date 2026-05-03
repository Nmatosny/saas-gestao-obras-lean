'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ChevronRight,
  ArrowRight,
  Zap,
  Lightbulb
} from 'lucide-react'

interface OverviewTabProps {
  atividades: any[]
  diarios: any[]
  obra: any
  onSetAba: (aba: string) => void
}

export default function OverviewTab({ atividades, diarios, obra, onSetAba }: OverviewTabProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch(`/api/obras/${obra.id}/alerts`)
        if (res.ok) {
          const data = await res.json()
          setAlerts(data)
        }
      } catch (e) {} finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [obra.id])

  const ativsProgramadas = atividades.filter(a => a.scheduled)
  
  // Se a obra estiver vazia, mostra estado de Onboarding
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

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Resumo de Hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20" />
           <div className="relative z-10">
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">Status da Operação</h3>
              <p className="text-slate-400 font-medium mb-10 text-sm">Visão geral do canteiro para o dia de hoje.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">PPC Semanal</p>
                    <p className="text-2xl font-black text-blue-400">82%</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tarefas Hoje</p>
                    <p className="text-2xl font-black text-white">{ativsProgramadas.length}</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Em Alerta</p>
                    <p className="text-2xl font-black text-red-400">{alerts.filter(a => a.type === 'critico').length}</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dias p/ Fim</p>
                    <p className="text-2xl font-black text-emerald-400">124</p>
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => onSetAba('campo')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Apontar Produção
                 </button>
                 <button onClick={() => onSetAba('gestao')} className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Ver Diários
                 </button>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                 <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h4 className="text-lg font-black text-slate-800 tracking-tight">Sugestões de Ação</h4>
           </div>
           
           <div className="space-y-4 flex-1">
              {loading ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />)
              ) : alerts.length > 0 ? (
                alerts.slice(0, 3).map((a, i) => (
                  <div key={i} className={`p-5 rounded-2xl border transition-all ${a.type === 'critico' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${a.type === 'critico' ? 'bg-red-500' : 'bg-amber-500'}`} />
                       <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{a.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-3">{a.message}</p>
                    <button className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${a.type === 'critico' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                       {a.action}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase">Tudo saudável hoje</p>
                </div>
              )}
           </div>
           
           <button className="w-full mt-6 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2">
              Ver todos os alertas <ArrowRight className="w-3 h-3" />
           </button>
        </div>

      </div>

      {/* Seções Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm group cursor-pointer hover:border-blue-200 transition-all" onClick={() => onSetAba('relatorio')}>
            <div className="flex justify-between items-start mb-6">
               <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6" />
               </div>
               <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight mb-2">Relatório Executivo</h4>
            <p className="text-sm text-slate-500 font-medium">Veja a Curva S, indicadores financeiros (EVA) e projeção de término.</p>
         </div>

         <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm group cursor-pointer hover:border-blue-200 transition-all" onClick={() => onSetAba('planejamento')}>
            <div className="flex justify-between items-start mb-6">
               <div className="w-14 h-14 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
               </div>
               <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight mb-2">Plano de Ataque</h4>
            <p className="text-sm text-slate-500 font-medium">Gestão do cronograma mestre, linha de balanço e dependências técnicas.</p>
         </div>
      </div>

    </div>
  )
}
