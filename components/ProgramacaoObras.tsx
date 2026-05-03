'use client'

import { useState, useMemo } from 'react'
import { 
  History, Folder, ChevronRight, ChevronDown, CheckCircle2, 
  Calendar, Layers, Box, LayoutGrid, CheckSquare, Square, Rocket, ArrowRight
} from 'lucide-react'

type Service = { id: string; name: string; color: string }
type Location = { id: string; name: string; order: number }
type Atividade = {
  id: string; name: string; startDate: string; endDate: string; scheduled: boolean; versaoId?: string; locationId: string; serviceId: string; service?: Service; location?: Location;
}

type Props = {
  atividades: Atividade[]
  versoes: any[]
  onUpdate: (id: string, data: Partial<Atividade>) => void
  onComplete: () => void // PONTO 11 - ADICIONADO PARA MUDAR DE ABA
}

export default function ProgramacaoObras({ atividades, versoes, onUpdate, onComplete }: Props) {
  const [selectedVersao, setSelectedVersao] = useState<string>('mestre')
  const [expandedLocs, setExpandedLocs] = useState<Record<string, boolean>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const ativsDaVersao = useMemo(() => {
    if (selectedVersao === 'mestre') return atividades.filter(a => !a.versaoId && !a.scheduled)
    return atividades.filter(a => a.versaoId === selectedVersao && !a.scheduled)
  }, [atividades, selectedVersao])

  const groupedByLocation = ativsDaVersao.reduce((acc, ativ) => {
    const locName = ativ.location?.name || 'Geral'
    if (!acc[locName]) acc[locName] = []
    acc[locName].push(ativ)
    return acc
  }, {} as Record<string, Atividade[]>)

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleFolder = (tasks: Atividade[]) => {
    const next = new Set(selectedIds)
    const allSelected = tasks.every(t => next.has(t.id))
    tasks.forEach(t => {
      if (allSelected) next.delete(t.id)
      else next.add(t.id)
    })
    setSelectedIds(next)
  }

  async function handleBulkProgram() {
    if (selectedIds.size === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/atividades/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds), 
          data: { scheduled: true, status: 'programado' } 
        })
      })
      
      if (res.ok) {
        // Notifica o pai para recarregar tudo de uma vez de forma eficiente
        onComplete()
        setSelectedIds(new Set())
      } else {
        const errorData = await res.json()
        alert(`Erro ao programar: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (err) {
      console.error(err)
      alert("Erro de conexão com o servidor. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><History className="w-6 h-6 text-blue-500" /> Central de Programação</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Selecione as tarefas na lista abaixo para enviar ao Kanban.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 pl-6 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronograma:</span>
          <select value={selectedVersao} onChange={(e) => setSelectedVersao(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 min-w-[240px]">
            <option value="mestre">Plano Mestre Geral</option>
            {Array.isArray(versoes) && [...versoes].reverse().map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-4">
        {Object.keys(groupedByLocation).length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
             <LayoutGrid className="w-10 h-10 text-slate-100 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Todas as atividades deste cronograma já foram programadas.</p>
          </div>
        ) : (
          Object.entries(groupedByLocation).map(([locName, tasks]) => {
            const isExpanded = expandedLocs[locName] || false
            const folderSelectedCount = tasks.filter(t => selectedIds.has(t.id)).length
            const isAllFolderSelected = folderSelectedCount === tasks.length

            return (
              <div key={locName} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className={`p-6 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                  <div className="flex items-center gap-6 flex-1" onClick={() => setExpandedLocs(prev => ({ ...prev, [locName]: !isExpanded }))}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFolder(tasks) }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAllFolderSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white'}`}
                    >
                      {isAllFolderSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-transparent" />}
                    </button>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300"><Folder className="w-6 h-6" /></div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">{locName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tasks.length} atividades disponíveis</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setExpandedLocs(prev => ({ ...prev, [locName]: !isExpanded }))} className="text-slate-300">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50 bg-white">
                    {tasks.map(task => (
                      <div key={task.id} 
                        onClick={() => toggleSelection(task.id)}
                        className={`p-6 pl-24 flex items-center gap-6 cursor-pointer transition-all ${selectedIds.has(task.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.has(task.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200 bg-white'}`}>
                           {selectedIds.has(task.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                         <div className="flex-1">
                            <p className="text-sm font-black text-slate-800 mb-1">{task.name}</p>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <span className="flex items-center gap-1.5">
                                 <Calendar className="w-3.5 h-3.5" /> 
                                 {isNaN(new Date(task.startDate).getTime()) ? 'Data Pendente' : new Date(task.startDate).toLocaleDateString('pt-BR')}
                               </span>
                               <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> {task.service?.name || 'Sem Serviço'}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Botão de Ação Flutuante */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
           <button 
            onClick={handleBulkProgram}
            disabled={loading}
            className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all group ring-8 ring-white"
           >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Rocket className="w-6 h-6 text-blue-400 fill-blue-400 group-hover:rotate-12 transition-transform" />
              )}
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Criar Programação</p>
                 <p className="text-sm font-black">{selectedIds.size} tarefas selecionadas <ArrowRight className="w-4 h-4 inline ml-2 group-hover:translate-x-1 transition-transform" /></p>
              </div>
           </button>
        </div>
      )}
    </div>
  )
}
