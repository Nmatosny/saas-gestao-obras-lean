'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle2, Clock, Calendar,
  Search, Folder, Layers,
  Plus, X, AlertCircle, GripVertical, ShieldAlert,
  Rocket
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

import { Atividade, Restricao } from '@/lib/types'

type Props = {
  atividades: Atividade[]
  onUpdateTask: (id: string, data: Partial<Atividade>) => void
  onStatusChange: (id: string, newStatus: string) => void
  onGoToProgramacao?: () => void 
}

// ─── Componente Principal ──────────────────────────────────────────────────────

export default function KanbanTarefas({ atividades, onUpdateTask, onStatusChange, onGoToProgramacao }: Props) {
  const [hasMounted, setHasMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [selectedTask, setSelectedTask] = useState<Atividade | null>(null)
  const [impedimentoPendente, setImpedimentoPendente] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const init = () => setHasMounted(true)
    init()
  }, [])

  const columns = [
    { id: 'programado', name: 'Fila da Semana', icon: <Calendar className="w-4 h-4" /> },
    { id: 'em_andamento', name: 'Em Execução', icon: <Clock className="w-4 h-4" /> },
    { id: 'concluido', name: 'Produção Concluída', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'impedido', name: 'Com Impedimento', icon: <ShieldAlert className="w-4 h-4 text-red-500" /> },
  ]

  const services = useMemo(() => Array.from(new Set(atividades.map(a => a.service?.name).filter(Boolean))), [atividades])
  const locations = useMemo(() => Array.from(new Set(atividades.map(a => a.location?.name).filter(Boolean))), [atividades])

  const filteredAtivs = useMemo(() => {
    return atividades.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase())
      const serviceMatch = !filterService || a.service?.name === filterService
      const locMatch = !filterLocation || a.location?.name === filterLocation
      return nameMatch && serviceMatch && locMatch
    })
  }, [atividades, searchTerm, filterService, filterLocation])

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    if (destination.droppableId === 'impedido') {
      setImpedimentoPendente({ id: draggableId })
    } else {
      onStatusChange(draggableId, destination.droppableId)
    }
  }

  if (!hasMounted) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
       {[1,2,3].map(i => <div key={i} className="bg-slate-50 h-[500px] rounded-[2.5rem]" />)}
    </div>
  )

  // ESTADO DE ONBOARDING: Se não há nada no Kanban
  if (atividades.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] p-20 border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
         <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8">
            <Rocket className="w-10 h-10" />
         </div>
         <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Seu Kanban está aguardando programação</h3>
         <p className="text-slate-500 font-medium max-w-sm mb-10 text-sm">
           Para ver atividades aqui, você precisa primeiro selecioná-las no menu de **Programação**.
         </p>
         <button 
           onClick={onGoToProgramacao}
           className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all"
         >
           Ir para Programação
         </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
         <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              placeholder="Buscar tarefa..."
              className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto">
            <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-700" value={filterService} onChange={e => setFilterService(e.target.value)}>
               <option value="">Serviços</option>
               {services.map(s => <option key={s} value={s!}>{s}</option>)}
            </select>
            <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-700" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
               <option value="">Locais</option>
               {locations.map(l => <option key={l} value={l!}>{l}</option>)}
            </select>
         </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {columns.map(col => (
            <div key={col.id} className="space-y-4">
              <div className="flex items-center justify-between px-4 mb-2">
                 <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">{col.icon} {col.name}</h3>
                 <span className="text-[10px] font-black text-slate-300">
                   {filteredAtivs.filter(a => a.status === col.id).length}
                 </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-4 min-h-[600px] p-4 rounded-[2.5rem] border border-dashed transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/30 border-slate-100'
                    }`}
                  >
                    {filteredAtivs.filter(a => a.status === col.id).map((a, index) => {
                      const diasAtraso = Math.max(0, Math.floor((new Date().getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                      const isDelayed = a.status !== 'concluido' && diasAtraso > 0 && a.progress < (a.plannedProgress || 0)

                      return (
                        <Draggable key={a.id} draggableId={a.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl relative group ${
                                snapshot.isDragging ? 'shadow-2xl ring-4 ring-blue-500/20 scale-105 z-50' : ''
                              } ${a.isCritical ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-slate-200'}`}
                              onClick={() => setSelectedTask(a)}
                            >
                              <div className="flex items-start justify-between mb-4">
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                       <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                         a.isCritical ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                                       }`}>
                                         {a.isCritical ? 'Crítico' : 'Normal'}
                                       </span>
                                       {isDelayed && (
                                         <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                                           {diasAtraso}d Atraso
                                         </span>
                                       )}
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">{a.name}</h4>
                                 </div>
                                 <GripVertical className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                               </div>

                               {a.causaNaoCumprimento && isDelayed && (
                                 <div className="mb-4 bg-red-50 border border-red-100 p-2 rounded-xl flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                    <span className="text-[9px] font-black text-red-600 uppercase">Motivo: {a.causaNaoCumprimento}</span>
                                 </div>
                               )}

                              <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                 <div className="flex items-center gap-2 mb-2">
                                    <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <p className="text-[11px] font-black text-slate-700 truncate" title={a.location?.name || 'Geral'}>{a.location?.name || 'Geral'}</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{a.service?.name || 'Serviço Genérico'}</p>
                                 </div>
                              </div>

                              <div className="space-y-3">
                                 <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                         a.progress >= a.plannedProgress ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                       }`}>
                                          {Math.round(a.progress)}%
                                       </div>
                                       {a.restricoes && a.restricoes.filter(r => !r.resolvido).length > 0 && (
                                         <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                             <AlertCircle className="w-3 h-3 text-amber-500" />
                                             <span className="text-[9px] font-black text-amber-600">{a.restricoes.filter(r => !r.resolvido).length}</span>
                                         </div>
                                       )}
                                    </div>
                                    <div className="text-right">
                                       <p className="text-[8px] font-black text-slate-300 uppercase">Meta Planejada</p>
                                       <p className="text-[10px] font-bold text-slate-400">{a.plannedProgress}%</p>
                                    </div>
                                 </div>
                                 
                                 <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-1000 ease-out ${
                                        a.progress >= (a.plannedProgress || 0) ? 'bg-emerald-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${a.progress}%` }}
                                    />
                                 </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {selectedTask && (
        <DetalhesTarefaModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={onUpdateTask}
        />
      )}

      {impedimentoPendente && (
        <ImpedimentoModal
          onConfirm={(causa, observacao) => {
            onUpdateTask(impedimentoPendente.id, { causaNaoCumprimento: causa, impactoDescricao: observacao })
            onStatusChange(impedimentoPendente.id, 'impedido')
            setImpedimentoPendente(null)
          }}
          onCancel={() => setImpedimentoPendente(null)}
        />
      )}
    </div>
  )
}

const CAUSAS_CNC = [
  'Mão de Obra', 'Material', 'Equipamento', 'Clima', 'Projeto', 'Financeiro', 'Logística', 'Outros'
]

function ImpedimentoModal({ onConfirm, onCancel }: { onConfirm: (causa: string, obs: string) => void; onCancel: () => void }) {
  const [causa, setCausa] = useState('')
  const [obs, setObs] = useState('')

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrar</p>
              <h3 className="text-lg font-black text-slate-800">Causa do Impedimento</h3>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Categoria (obrigatório)</p>
            <div className="flex flex-wrap gap-2">
              {CAUSAS_CNC.map(c => (
                <button
                  key={c}
                  onClick={() => setCausa(c)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${causa === c ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Observação (opcional)</p>
            <textarea
              rows={3}
              placeholder="Descreva o impacto no andamento..."
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 resize-none border-none focus:ring-2 focus:ring-red-500"
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 py-3 font-black uppercase text-slate-400 tracking-widest text-[10px] hover:text-slate-600">Cancelar</button>
            <button
              onClick={() => { if (causa) onConfirm(causa, obs) }}
              disabled={!causa}
              className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-100 disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              Confirmar Impedimento
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetalhesTarefaModal({ task, onClose, onUpdateTask }: { task: Atividade; onClose: () => void; onUpdateTask: (id: string, d: Partial<Atividade>) => void }) {
  const [nova, setNova] = useState('')
  const [restricoes, setRestricoes] = useState<Restricao[]>([])
  const [causa, setCausa] = useState(task.causaNaoCumprimento || '')

  useEffect(() => {
    fetch(`/api/restricoes?atividadeId=${task.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRestricoes(data) })
      .catch(() => {})
  }, [task.id])

  async function updateCausa(c: string) {
    setCausa(c)
    onUpdateTask(task.id, { causaNaoCumprimento: c })
  }

  async function add() {
    if(!nova) return
    const res = await fetch('/api/restricoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ atividadeId: task.id, descricao: nova }) })
    if(res.ok) {
      const r = await res.json()
      setRestricoes([...restricoes, r])
      setNova('')
    }
  }

  async function toggle(id: string, curr: boolean) {
    const res = await fetch('/api/restricoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resolvido: !curr }) })
    if(res.ok) setRestricoes(prev => prev.map(r => r.id === id ? {...r, resolvido: !curr} : r))
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
       <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist de Prontidão</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{task.name}</h3>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          
          <div className="p-8 space-y-10">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <AlertCircle className="w-3 h-3 text-red-500" /> Causa de Não Cumprimento (CNC)
                </p>
                <div className="flex flex-wrap gap-2">
                   {CAUSAS_CNC.map(c => (
                     <button 
                        key={c} 
                        onClick={() => updateCausa(c)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${causa === c ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}
                      >
                        {c}
                     </button>
                   ))}
                </div>
             </div>

             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Layers className="w-3 h-3 text-blue-500" /> Restrições de Campo
                </p>
                <div className="flex gap-2 mb-4">
                   <input 
                     placeholder="Adicionar restrição..." 
                     className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" 
                     value={nova} 
                     onChange={e => setNova(e.target.value)} 
                   />
                   <button onClick={add} className="bg-blue-600 text-white p-3 rounded-xl">
                      <Plus className="w-5 h-5" />
                   </button>
                </div>
                <div className="space-y-3">
                   {Array.isArray(restricoes) && restricoes.map(r => (
                     <div key={r.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                        <button 
                          onClick={() => toggle(r.id, r.resolvido)} 
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${r.resolvido ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white'}`}
                        >
                           {r.resolvido && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <span className={`text-sm font-bold ${r.resolvido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                           {r.descricao}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  )
}
