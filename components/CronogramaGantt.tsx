'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

type Atividade = {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  service?: { name: string, color: string }
  location?: { name: string }
}

type Props = {
  atividades: Atividade[]
  onUpdateAtividade: (id: string, data: Record<string, unknown>) => void
}

export default function CronogramaGantt({ atividades, onUpdateAtividade: _onUpdateAtividade }: Props) {
  const [view, setView] = useState<'mes' | 'semana'>('mes')

  if (atividades.length === 0) return null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
           </div>
           <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Cronograma Mestre</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visualização em Linha do Tempo</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setView('semana')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'semana' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
           >
             Semanal
           </button>
           <button 
             onClick={() => setView('mes')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'mes' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
           >
             Mensal
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">Atividade</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Início / Fim</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {atividades.map((ativ) => (
                <tr key={ativ.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ativ.service?.color || '#cbd5e1' }} />
                       <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{ativ.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-black text-slate-400 uppercase">{ativ.location?.name || 'Geral'}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-600">{new Date(ativ.startDate).toLocaleDateString('pt-BR')}</span>
                       <span className="text-[10px] text-slate-300 font-medium">Até {new Date(ativ.endDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="w-32">
                       <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black text-slate-800">{Math.round(ativ.progress)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                            style={{ width: `${ativ.progress}%` }} 
                          />
                       </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      ativ.progress === 100 ? 'bg-emerald-50 text-emerald-600' : 
                      ativ.progress > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {ativ.progress === 100 ? 'Concluído' : ativ.progress > 0 ? 'Em Curso' : 'Planejado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
