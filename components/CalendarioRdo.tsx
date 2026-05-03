'use client'

import { useState } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  CloudSun, 
  Users, 
  Plus,
  ArrowRight
} from 'lucide-react'

type Diario = {
  id: string
  date: string
  weatherMorning?: string
  notes?: string
  efetivos?: { role: string; count: number }[]
}

type Props = {
  diarios: Diario[]
  onSelectDay: (diario: Diario | null, date: Date) => void
  onNewRdo: (date: Date) => void
}

export default function CalendarioRdo({ diarios, onSelectDay, onNewRdo }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  // Helpers de data
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()
  const firstDayIndex = startOfMonth.getDay()

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const isToday = (d: number) => {
    const today = new Date()
    return today.getDate() === d && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()
  }

  const getDiarioDoDia = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
    return diarios.find(d => d.date.split('T')[0] === dateStr)
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Header do Calendário */}
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
         <div className="flex items-center gap-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-1">
               <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100">
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100">
                 <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
         <button
           onClick={() => onNewRdo(selectedDate || new Date())}
           className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
         >
           <Plus className="w-3.5 h-3.5" /> Novo RDO
         </button>
      </div>

      {/* Grade de Dias */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-7 mb-4">
          {diasDaSemana.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest pb-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Espaços vazios do mês anterior */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Dias do Mês */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const diario = getDiarioDoDia(day)
            const isSelected = selectedDate?.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth()
            
            return (
              <button
                key={day}
                onClick={() => {
                  const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  setSelectedDate(d)
                  onSelectDay(diario || null, d)
                }}
                className={`aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center relative group ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' 
                    : 'border-slate-50 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-black ${isSelected ? 'text-blue-600' : isToday(day) ? 'text-slate-900' : 'text-slate-400'}`}>
                  {day}
                </span>
                
                {diario ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 absolute bottom-2" />
                ) : (
                  day < new Date().getDate() || currentMonth < new Date(new Date().getFullYear(), new Date().getMonth(), 1) ? (
                    <div className="w-1.5 h-1.5 bg-slate-200 rounded-full absolute bottom-2" />
                  ) : null
                )}

                {isToday(day) && !isSelected && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center gap-6">
         <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Preenchido</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Pendente</span>
         </div>
      </div>
    </div>
  )
}
