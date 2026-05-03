'use client'

import { Activity, Clock, AlertCircle } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Service = { id: string; name: string; color: string }
type Location = { id: string; name: string; order: number }
type Atividade = {
  id: string
  name: string
  startDate: string
  endDate: string
  cost: number
  weight: number
  progress: number
  plannedProgress: number
  locationId: string
  serviceId: string
  service?: Service
}

type Props = {
  atividades: Atividade[]
  locais: Location[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMs(iso: string) { return new Date(iso).getTime() }

function formatDateBR(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

function monthsBetween(minMs: number, maxMs: number): Date[] {
  const months: Date[] = []
  const cursor = new Date(minMs)
  cursor.setDate(1); cursor.setHours(0, 0, 0, 0)
  const end = new Date(maxMs)
  while (cursor <= end) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

const MONTH_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const ROW_HEIGHT = 64
const LABEL_WIDTH = 140

// ─── Componente ───────────────────────────────────────────────────────────────

export default function LinhaDeBalancoChart({ atividades, locais }: Props) {
  if (atividades.length === 0 || locais.length === 0) return null

  const todayMs = new Date().getTime()
  const minMs = Math.min(...atividades.map((a) => toMs(a.startDate)))
  const maxMs = Math.max(...atividades.map((a) => toMs(a.endDate)))
  const totalMs = maxMs - minMs
  const months = monthsBetween(minMs, maxMs)
  const locaisOrdenados = [...locais].sort((a, b) => b.order - a.order)

  // Extrair serviços únicos para a legenda (Ponto 10 - REINTEGRADO)
  const uniqueServices = Array.from(new Map(atividades.map(a => [a.serviceId, a.service]).filter(([id, s]) => !!s)).values())

  const ativByLocation: Record<string, Atividade[]> = {}
  atividades.forEach((a) => {
    if (!ativByLocation[a.locationId]) ativByLocation[a.locationId] = []
    ativByLocation[a.locationId].push(a)
  })

  function barGeometry(a: Atividade) {
    const left = ((toMs(a.startDate) - minMs) / totalMs) * 100
    const width = ((toMs(a.endDate) - toMs(a.startDate)) / totalMs) * 100
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` }
  }

  const todayLeft = ((todayMs - minMs) / totalMs) * 100
  const gridH = locaisOrdenados.length * ROW_HEIGHT

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 800, position: 'relative' }}>

          {/* Header Eixo X */}
          <div className="flex border-b border-slate-50 bg-slate-50/50 backdrop-blur-sm">
            <div className="flex-shrink-0 border-r border-slate-100" style={{ width: LABEL_WIDTH }} />
            <div className="relative flex-1" style={{ height: 48 }}>
              {months.map((m, i) => {
                const left = ((m.getTime() - minMs) / totalMs) * 100
                const showYear = i === 0 || m.getFullYear() !== months[i - 1].getFullYear()
                return (
                  <div key={m.toISOString()} className="absolute top-0 h-full flex flex-col justify-center pl-3 border-l border-slate-100" style={{ left: `${left}%` }}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {MONTH_LABEL[m.getMonth()]} {showYear && <span className="text-slate-300 ml-1">{m.getFullYear()}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grade e Barras */}
          <div className="flex relative">
            <div className="flex-shrink-0 border-r border-slate-100 bg-white" style={{ width: LABEL_WIDTH }}>
              {locaisOrdenados.map((loc) => (
                <div key={loc.id} className="flex flex-col justify-center px-6 border-b border-slate-50 last:border-0" style={{ height: ROW_HEIGHT }}>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter truncate">{loc.name}</span>
                </div>
              ))}
            </div>

            <div className="relative flex-1" style={{ height: gridH }}>
              {todayLeft >= 0 && todayLeft <= 100 && (
                <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 flex flex-col items-center group pointer-events-none" style={{ left: `${todayLeft}%` }}>
                  <div className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full -mt-2 shadow-lg">HOJE</div>
                </div>
              )}

              {locaisOrdenados.map((_, i) => <div key={i} className="absolute w-full border-b border-slate-50" style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }} />)}
              {months.map(m => <div key={m.toISOString()} className="absolute top-0 h-full border-l border-slate-50" style={{ left: `${((m.getTime() - minMs) / totalMs) * 100}%` }} />)}

              {locaisOrdenados.map((loc, rowIndex) => {
                const ativs = ativByLocation[loc.id] ?? []
                return ativs.map((a) => {
                  const { left, width } = barGeometry(a)
                  const isDelayed = a.progress < a.plannedProgress
                  const color = a.service?.color ?? '#94a3b8'
                  return (
                    <div key={a.id} className="absolute rounded-xl shadow-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] z-20" style={{ left, width, top: rowIndex * ROW_HEIGHT + 14, height: ROW_HEIGHT - 28, border: `1.5px solid ${color}33` }}>
                      <div className="absolute inset-0 bg-slate-50 opacity-40" />
                      <div className="h-full transition-all duration-1000 flex items-center justify-center relative" style={{ width: `${a.progress}%`, backgroundColor: isDelayed ? '#ef4444' : color }}>
                         <span className="text-[10px] font-black text-white truncate px-1">{a.progress > 20 ? `${a.progress}%` : ''}</span>
                      </div>
                      {isDelayed && (
                        <div className="absolute top-0 right-0 p-1 opacity-40">
                           <AlertCircle className="w-3 h-3 text-red-500" />
                        </div>
                      )}
                    </div>
                  )
                })
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda (Ponto 10) */}
      <div className="flex flex-wrap items-center gap-6 px-8 py-6 bg-slate-50/50 border-t border-slate-50">
         <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-red-500" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atraso</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-200" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planejado</span>
            </div>
         </div>
         <div className="flex flex-wrap gap-4">
            {uniqueServices.map(s => (
              <div key={s!.id} className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s!.color }} />
                 <span className="text-[10px] font-bold text-slate-500 uppercase">{s!.name}</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}
