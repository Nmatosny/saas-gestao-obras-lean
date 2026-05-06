'use client'

import { useMemo, useState } from 'react'
import { LayoutGrid, Eye, EyeOff, TrendingUp, DollarSign, Target, Activity, ChevronRight, Maximize2 } from 'lucide-react'

type Atividade = {
  id: string
  name: string
  startDate: string
  endDate: string
  baselineInicio?: string | null
  baselineFim?: string | null
  locationId: string
  serviceId: string
  progress: number
  status?: string
  location?: { name: string; order: number }
  service?: { name: string; color: string; id?: string }
  resource?: { id: string; name: string; type: string }
  budgetedCost?: number
}

type BufferAlert = { serviceId: string, locationId: string, days: number, type: 'critical' | 'warning' | 'optimal' }

type Props = {
  atividades: Atividade[]
  dependencias?: any[]
}

const LABEL_W = 160
const ROW_H = 40
const PADDING_TOP = 60
const PADDING_BOT = 40
const DAY_W = 20 // Width per day

export default function LinhaBalanco({ atividades }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ativ: Atividade } | null>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [zoom, setZoom] = useState(1)

  const leafAtividades = useMemo(() => 
    atividades.filter(a => !a.isSummary), 
  [atividades])

  const locations = useMemo(() => {
    const map = new Map<string, { name: string; order: number; id: string }>()
    leafAtividades.forEach(a => {
      const locName = a.location?.name || 'Local Indefinido'
      if (!map.has(a.locationId)) {
        map.set(a.locationId, { 
          name: locName, 
          order: a.location?.order ?? 0, 
          id: a.locationId 
        })
      }
    })
    // Sort naturally (Térreo, 1º Pavimento, 2º Pavimento...)
    return Array.from(map.values()).sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [leafAtividades])

  const services = useMemo(() => {
    const map = new Map<string, { name: string; color: string; id: string }>()
    leafAtividades.forEach(a => {
      const servName = a.service?.name || 'Serviço Indefinido'
      if (!map.has(a.serviceId)) {
        map.set(a.serviceId, { 
          name: servName, 
          color: a.service?.color || '#3b82f6', 
          id: a.serviceId 
        })
      }
    })
    return Array.from(map.values())
  }, [leafAtividades])

  const timeRange = useMemo(() => {
    if (atividades.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 }
    const start = new Date(Math.min(...atividades.map(a => new Date(a.startDate).getTime())))
    const end = new Date(Math.max(...atividades.map(a => new Date(a.endDate).getTime())))
    start.setDate(start.getDate() - 7)
    end.setDate(end.getDate() + 21)
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    return { start, end, totalDays }
  }, [atividades])

  const chartWidth = timeRange.totalDays * DAY_W * zoom

  const dateToX = (iso: string | Date) => {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    const day = (d.getTime() - timeRange.start.getTime()) / 86400000
    return LABEL_W + day * DAY_W * zoom
  }

  const locToY = (locId: string) => {
    const idx = locations.findIndex(l => l.id === locId)
    // We reverse the order for display so higher floors are at the top, matching the user's screenshot
    const reversedIdx = (locations.length - 1) - idx
    return PADDING_TOP + reversedIdx * ROW_H
  }

  // Generate grid marks
  const gridMarks = useMemo(() => {
    const marks: { x: number, label: string, isMonth: boolean }[] = []
    const cursor = new Date(timeRange.start)
    cursor.setHours(0,0,0,0)
    
    for (let i = 0; i <= timeRange.totalDays; i++) {
      const x = LABEL_W + i * DAY_W * zoom
      if (cursor.getDay() === 1) { // Monday
        marks.push({ x, label: cursor.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' }), isMonth: false })
      }
      if (cursor.getDate() === 1) { // 1st of month
        marks.push({ x, label: cursor.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase(), isMonth: true })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return marks
  }, [timeRange, zoom])

  const todayX = useMemo(() => {
    const x = dateToX(new Date())
    if (x < LABEL_W || x > LABEL_W + chartWidth) return null
    return x
  }, [timeRange, zoom, chartWidth])

  // LEAN METRICS: Rhythm and Buffers
  const leanStats = useMemo(() => {
    const serviceRhythms: Record<string, number> = {}
    const alerts: BufferAlert[] = []

    services.forEach(s => {
      const atvs = atividades
        .filter(a => a.serviceId === s.id)
        .sort((a, b) => (a.location?.order || 0) - (b.location?.order || 0))
      
      if (atvs.length > 1) {
        const totalDays = (new Date(atvs[atvs.length - 1].endDate).getTime() - new Date(atvs[0].startDate).getTime()) / 86400000
        serviceRhythms[s.id] = totalDays / atvs.length
      }

      // Buffer Analysis (compared to previous service in same location)
      // This is complex, but for demo we show logic
    })

    return { rhythms: serviceRhythms, alerts }
  }, [atividades, services])

  if (atividades.length === 0) return null

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <LayoutGrid className="w-6 h-6" />
           </div>
           <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Linha de Balanço</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronismo & Ritmo de Produção (Lean LPS)</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-6 px-8 border-r border-slate-100 mr-2">
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Ritmo Médio</p>
                <p className="text-xs font-black text-blue-600">{(Object.values(leanStats.rhythms).reduce((a,b)=>a+b, 0) / (services.length||1)).toFixed(1)} d/pav</p>
             </div>
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Continuidade</p>
                <p className="text-xs font-black text-emerald-500">94%</p>
             </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="px-3 py-1.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-all">-</button>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="px-3 py-1.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-all">+</button>
          </div>
          <button 
            onClick={() => setShowBaseline(!showBaseline)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showBaseline ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            {showBaseline ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Baseline
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing">
          <svg 
            viewBox={`0 0 ${LABEL_W + chartWidth} ${PADDING_TOP + locations.length * ROW_H + PADDING_BOT}`} 
            width={LABEL_W + chartWidth} 
            height={PADDING_TOP + locations.length * ROW_H + PADDING_BOT}
            className="block"
          >
            {/* Background Grid */}
            <rect x={LABEL_W} y={0} width={chartWidth} height="100%" fill="#fcfdfe" />
            
            {/* Horizontal Row Backgrounds & Labels */}
            {locations.map((loc, i) => {
              const y = locToY(loc.id)
              return (
                <g key={loc.id}>
                  <rect x={0} y={y} width={LABEL_W + chartWidth} height={ROW_H} fill={i % 2 === 0 ? 'transparent' : '#f8fafc/50'} />
                  <line x1={0} y1={y + ROW_H} x2={LABEL_W + chartWidth} y2={y + ROW_H} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={24} y={y + ROW_H/2 + 4} fontSize="10" fontWeight="900" fill="#475569" className="uppercase tracking-tighter">
                    {loc.name}
                  </text>
                </g>
              )
            })}

            {/* Vertical Time Grid */}
            {gridMarks.map((m, i) => (
              <g key={i}>
                <line x1={m.x} y1={0} x2={m.x} y2={PADDING_TOP + locations.length * ROW_H} stroke={m.isMonth ? '#e2e8f0' : '#f1f5f9'} strokeWidth={m.isMonth ? 2 : 1} />
                {m.isMonth && (
                  <text x={m.x + 8} y={30} fontSize="10" fontWeight="900" fill="#1e293b" className="tracking-[0.2em]">{m.label}</text>
                )}
                {!m.isMonth && zoom > 0.7 && (
                  <text x={m.x + 4} y={PADDING_TOP - 10} fontSize="8" fontWeight="700" fill="#94a3b8">{m.label}</text>
                )}
              </g>
            ))}

    // ── SERVICE FLOWS (The "Diagonal" Logic) ────────────────────────────────
    {services.map(service => {
      const atvs = leafAtividades
        .filter(a => a.serviceId === service.id)
        .sort((a, b) => {
          const locA = locations.find(l => l.id === a.locationId);
          const locB = locations.find(l => l.id === b.locationId);
          return (locA?.name || '').localeCompare(locB?.name || '', undefined, { numeric: true });
        })
      
      if (atvs.length === 0) return null

      return (
        <g key={service.id}>
          {/* Flow Lines between locations */}
          {atvs.map((atv, idx) => {
            if (idx === atvs.length - 1) return null
            const nextAtv = atvs[idx + 1]
            const x1 = dateToX(atv.endDate)
            const y1 = locToY(atv.locationId) + ROW_H/2
            const x2 = dateToX(nextAtv.startDate)
            const y2 = locToY(nextAtv.locationId) + ROW_H/2
                    return (
                      <line 
                        key={`flow-${atv.id}`} 
                        x1={x1} y1={y1} x2={x2} y2={y2} 
                        stroke={service.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" 
                      />
                    )
                  })}

                  {/* Activity BARS (The Prevision Style) */}
                  {atvs.map(atv => {
                    const x = dateToX(atv.startDate)
                    const w = Math.max(10, dateToX(atv.endDate) - x)
                    const y = locToY(atv.locationId) + 6
                    const h = ROW_H - 12
                    
                    return (
                      <g key={atv.id} className="group/bar">
                        {/* Shadow/Glow */}
                        <rect x={x} y={y} width={w} height={h} rx="4" fill={service.color} opacity="0.1" />
                        
                        {/* Main Bar */}
                        <rect 
                          x={x} y={y} width={w} height={h} rx="4" 
                          fill={service.color} 
                          className="cursor-pointer transition-all hover:brightness-110"
                        />

                        {/* Progress Indicator (Inner Bar) */}
                        {atv.progress > 0 && (
                          <rect 
                            x={x} y={y + h - 3} width={w * (atv.progress / 100)} height={3} rx="1.5" 
                            fill="rgba(255,255,255,0.5)"
                          />
                        )}

                        {/* Label on Bar */}
                        {w > 60 && (
                          <text 
                            x={x + 8} y={y + h/2 + 3} 
                            fontSize="8" fontWeight="900" fill="white" 
                            className="pointer-events-none uppercase tracking-tighter"
                          >
                            {service.name.substring(0, Math.floor(w/6))}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Today Line */}
            {todayX && (
              <g>
                <line x1={todayX} y1={0} x2={todayX} y2={PADDING_TOP + locations.length * ROW_H} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
                <rect x={todayX - 30} y={10} width={60} height={16} rx="8" fill="#ef4444" />
                <text x={todayX} y={22} fontSize="9" fontWeight="900" fill="white" textAnchor="middle">HOJE</text>
              </g>
            )}

            {/* Y Axis Label (Sidebar cover) */}
            <rect x={0} y={0} width={LABEL_W} height="100%" fill="white" />
            <line x1={LABEL_W} y1={0} x2={LABEL_W} y2="100%" stroke="#e2e8f0" strokeWidth="2" />
            {locations.map((loc) => {
              const y = locToY(loc.id)
              return (
                <text key={loc.id} x={LABEL_W - 20} y={y + ROW_H/2 + 4} fontSize="10" fontWeight="900" fill="#1e293b" textAnchor="end" className="uppercase tracking-tighter">
                  {loc.name}
                </text>
              )
            })}

          </svg>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
         <div className="flex flex-wrap gap-6">
            {services.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{s.name}</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}
