'use client'

import { useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, Zap, Target, Calendar, 
  AlertTriangle, Clock, Users, Coffee
} from 'lucide-react'

type Atividade = {
  id: string; name: string; progress: number; plannedProgress: number; startDate: string; endDate: string; weight: number; causaNaoCumprimento?: string;
}
type Diario = {
  id: string; date: string; weatherMorning?: string; efetivos?: { role: string; count: number }[]
}
type Props = {
  atividades: Atividade[]
  diarios?: Diario[] // PONTO 4 - ADICIONADO
}

export default function IntelligenceTab({ atividades, diarios = [] }: Props) {
  
  const stats = useMemo(() => {
    if (atividades.length === 0) return null
    const totalWeight = atividades.reduce((acc, a) => acc + (a.weight || 1), 0)
    const currentProgress = atividades.reduce((acc, a) => acc + (a.progress * (a.weight || 1)), 0) / totalWeight
    const plannedProgress = atividades.reduce((acc, a) => acc + (a.plannedProgress * (a.weight || 1)), 0) / totalWeight
    
    const today = new Date()
    const startObra = new Date(Math.min(...atividades.map(a => new Date(a.startDate).getTime())))
    const endObra = new Date(Math.max(...atividades.map(a => new Date(a.endDate).getTime())))
    
    const diasPassados = Math.max(1, (today.getTime() - startObra.getTime()) / (1000 * 60 * 60 * 24))
    const velocidadeDiaria = currentProgress / diasPassados
    
    let conclusaoProjetada: Date | null = null
    if (velocidadeDiaria > 0) {
      const diasRestantes = (100 - currentProgress) / velocidadeDiaria
      conclusaoProjetada = new Date(today.getTime() + diasRestantes * 1000 * 60 * 60 * 24)
    }

    // Ponto 8 - Cálculo Simples de PPC (Percentual de Planejamento Concluído)
    // No nosso MVP: Atividades Concluídas / Atividades que deveriam estar concluídas
    const ativsDeveriamEstarProntas = atividades.filter(a => new Date(a.endDate).getTime() < today.getTime()).length
    const ativsProntas = atividades.filter(a => a.progress >= 100).length
    const ppc = ativsDeveriamEstarProntas > 0 ? (ativsProntas / ativsDeveriamEstarProntas) * 100 : 100

    // Cálculo de CNC (Motivos de Atraso)
    const cncCounts: Record<string, number> = {}
    atividades.forEach(a => {
      if (a.causaNaoCumprimento) {
        cncCounts[a.causaNaoCumprimento] = (cncCounts[a.causaNaoCumprimento] || 0) + 1
      }
    })
    const cncRanking = Object.entries(cncCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      currentProgress: Math.round(currentProgress),
      plannedProgress: Math.round(plannedProgress),
      desvio: Math.round(currentProgress - plannedProgress),
      conclusaoPlanejada: endObra,
      conclusaoProjetada,
      atrasoEstimado: Math.round(Math.abs(currentProgress - plannedProgress) / (velocidadeDiaria || 1)),
      ppc: Math.round(ppc),
      cncRanking
    }
  }, [atividades])

  if (!stats) return null
  const isDelayed = stats.desvio < 0

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Velocidade de Execução</span>
               </div>
               <div className="flex items-end gap-4 mb-8">
                  <h2 className="text-6xl font-black tracking-tighter">{stats.currentProgress}%</h2>
                  <div className="mb-2">
                     <p className="text-[10px] font-black text-slate-500 uppercase">Meta Atual</p>
                     <p className="text-xl font-bold text-slate-300">{stats.plannedProgress}%</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Conclusão Planejada</p>
                     <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /><p className="text-sm font-bold">{stats.conclusaoPlanejada.toLocaleDateString('pt-BR')}</p></div>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Conclusão Projetada</p>
                     <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${isDelayed ? 'text-red-400' : 'text-emerald-400'}`} />
                        <p className={`text-sm font-black ${isDelayed ? 'text-red-400' : 'text-emerald-400'}`}>{stats.conclusaoProjetada ? stats.conclusaoProjetada.toLocaleDateString('pt-BR') : '—'}</p>
                     </div>
                  </div>
               </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32" />
         </div>

         <div className={`rounded-[2.5rem] p-10 flex flex-col justify-between shadow-sm border ${isDelayed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div>
               <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${isDelayed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                     {isDelayed ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDelayed ? 'text-red-400' : 'text-emerald-400'}`}>Status de Prazo</span>
               </div>
               <h3 className={`text-4xl font-black tracking-tight mb-2 ${isDelayed ? 'text-red-900' : 'text-emerald-900'}`}>{isDelayed ? `${Math.abs(stats.desvio)}% Atraso` : 'Em Meta'}</h3>
               <p className={`text-sm font-medium leading-relaxed ${isDelayed ? 'text-red-700/70' : 'text-emerald-700/70'}`}>{isDelayed ? `A entrega final pode sofrer um atraso de até ${stats.atrasoEstimado} dias.` : 'Execução fluindo conforme planejado.'}</p>
            </div>
            <div className="mt-8">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PPC (Confiabilidade)</p>
               <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stats.ppc}%` }} />
                  </div>
                  <span className="text-xs font-black text-slate-800">{stats.ppc}%</span>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
         <div className="flex items-center gap-3 mb-10">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Produtividade de Mão de Obra</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efetivo Médio (Últimos Diários)</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <Users className="w-5 h-5 text-blue-500 mb-2" />
                     <p className="text-2xl font-black text-slate-800">{diarios.length > 0 ? Math.round(diarios.reduce((acc, d) => acc + (d.efetivos?.reduce((s: number, e: { role: string; count: number }) => s + (e.count || 0), 0) || 0), 0) / diarios.length) : 0}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Pessoas/Dia</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <Coffee className="w-5 h-5 text-amber-500 mb-2" />
                     <p className="text-2xl font-black text-slate-800">{diarios.filter(d => d.weatherMorning === 'chuvoso').length}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Dias de Chuva</p>
                  </div>
               </div>
            </div>
             <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6 border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-red-500" /> Pareto de Atrasos (CNC)</h4>
                <div className="space-y-5">
                   {stats.cncRanking.length > 0 ? stats.cncRanking.map(([motivo, count]) => (
                     <div key={motivo} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase">
                           <span>{motivo}</span>
                           <span>{count} ocorrências</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-red-500 rounded-full" 
                             style={{ width: `${(count / atividades.length) * 100}%` }} 
                           />
                        </div>
                     </div>
                   )) : (
                     <div className="py-10 text-center opacity-30">
                        <Coffee className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum desvio registrado</p>
                     </div>
                   )}
                </div>
             </div>
         </div>
      </div>
    </div>
  )
}
