'use client'

import { useState, useMemo } from 'react'
import { 
  Compass, ShieldCheck, AlertTriangle, CheckCircle2, 
  Clock, Plus, X, ArrowRight
} from 'lucide-react'

type Restricao = {
  id: string
  descricao: string
  resolvido: boolean
}

type Atividade = {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  location?: { name: string }
  service?: { name: string; color: string }
  restricoes?: Restricao[]
}

type Props = {
  atividades: Atividade[]
  onRefresh: () => void
}

export default function LookaheadTab({ atividades, onRefresh }: Props) {
  const [selectedTask, setSelectedTask] = useState<Atividade | null>(null)
  const [novaRestricao, setNovaRestricao] = useState('')

  // Lookahead: atividades que começam nos próximos 30 dias e ainda não começaram
  const hoje = useMemo(() => new Date(), [])
  const lookaheadAtivs = useMemo(() => {
    const limiteLookahead = new Date(hoje)
    limiteLookahead.setDate(hoje.getDate() + 30)
    return atividades
      .filter(a => {
        const start = new Date(a.startDate)
        return start >= hoje && start <= limiteLookahead && a.progress < 100
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [atividades, hoje])

  const stats = useMemo(() => {
    const total = lookaheadAtivs.length
    const comRestricao = lookaheadAtivs.filter(a => a.restricoes && a.restricoes.some(r => !r.resolvido)).length
    const limpas = total - comRestricao
    const saude = total > 0 ? Math.round((limpas / total) * 100) : 100
    return { total, comRestricao, limpas, saude }
  }, [lookaheadAtivs])

  async function toggleRestricao(id: string, resolvido: boolean) {
    const res = await fetch('/api/restricoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolvido: !resolvido })
    })
    if (res.ok) onRefresh()
  }

  async function addRestricao() {
    if (!novaRestricao || !selectedTask) return
    const res = await fetch('/api/restricoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atividadeId: selectedTask.id, descricao: novaRestricao })
    })
    if (res.ok) {
      setNovaRestricao('')
      onRefresh()
    }
  }

  return (
    <div className="space-y-10">
      
      {/* Header do Lookahead */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden col-span-1 md:col-span-2">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Janela de 30 Dias</p>
              <h3 className="text-2xl font-black mb-6">Saúde do Lookahead</h3>
              <div className="flex items-end gap-4">
                 <div className="text-6xl font-black">{stats.saude}%</div>
                 <div className="mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Prontidão</p>
                    <p className="text-xs font-medium text-slate-300 mt-1">{stats.limpas} de {stats.total} atividades sem restrições.</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Risco</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.comRestricao}</h4>
           </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Liberadas</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.limpas}</h4>
           </div>
        </div>
      </div>

      {/* Lista de Atividades do Lookahead */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" /> Atividades Próximas (Lookahead)
           </h3>
           <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">Próximos 30 dias</span>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full">
              <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Início</th>
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Atividade</th>
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Localização</th>
                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Restrições Pendentes</th>
                    <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {lookaheadAtivs.map(ativ => {
                   const pendentes = ativ.restricoes?.filter(r => !r.resolvido) || []
                   const isDelayed = new Date(ativ.startDate) < hoje && ativ.progress === 0

                   return (
                     <tr key={ativ.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 whitespace-nowrap">
                           <div className="flex flex-col">
                              <span className={`text-xs font-black ${isDelayed ? 'text-red-500' : 'text-slate-800'}`}>
                                 {new Date(ativ.startDate).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{isDelayed ? 'Atrasada' : 'Programada'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: ativ.service?.color || '#e2e8f0' }} />
                              <div>
                                 <p className="text-sm font-black text-slate-800">{ativ.name}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">{ativ.service?.name}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg uppercase">{ativ.location?.name || 'Geral'}</span>
                        </td>
                        <td className="px-8 py-6">
                           {pendentes.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                                {pendentes.map(r => (
                                  <span key={r.id} className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black border border-amber-100 uppercase">
                                     <AlertTriangle className="w-3 h-3" /> {r.descricao}
                                  </span>
                                ))}
                             </div>
                           ) : (
                             <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Liberado para Início
                             </span>
                           )}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                             onClick={() => setSelectedTask(ativ)}
                             className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100"
                           >
                              <Plus className="w-5 h-5" />
                           </button>
                        </td>
                     </tr>
                   )
                 })}
                 {lookaheadAtivs.length === 0 && (
                   <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-slate-200" />
                         </div>
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma atividade nos próximos 30 dias</p>
                      </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Modal de Gestão de Restrições (Lookahead) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedTask(null)} />
           <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-10 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist de Prontidão</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedTask.name}</h3>
                 </div>
                 <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-8">
                 {/* Lista Atual */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Condições para Iniciar
                    </p>
                    <div className="space-y-3">
                       {selectedTask.restricoes?.map(r => (
                         <div key={r.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl group">
                            <button 
                              onClick={() => toggleRestricao(r.id, r.resolvido)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${r.resolvido ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}
                            >
                               {r.resolvido && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            <span className={`text-sm font-bold flex-1 ${r.resolvido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                               {r.descricao}
                            </span>
                         </div>
                       ))}
                       {(!selectedTask.restricoes || selectedTask.restricoes.length === 0) && (
                         <div className="p-10 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <p className="text-xs font-black text-slate-300 uppercase italic">Nenhuma restrição listada</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Adicionar Nova */}
                 <div className="pt-6 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Novo Pré-requisito</p>
                    <div className="flex gap-2">
                       <input 
                         placeholder="Ex: Compra de material, Liberação de projeto..."
                         className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700"
                         value={novaRestricao}
                         onChange={e => setNovaRestricao(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && addRestricao()}
                       />
                       <button 
                         onClick={addRestricao}
                         className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                       >
                          <ArrowRight className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
