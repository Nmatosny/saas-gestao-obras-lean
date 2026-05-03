'use client'

import { useMemo, useState } from 'react'
import { LayoutGrid, Info, GitBranch, Eye, EyeOff } from 'lucide-react'

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
}

type Dependencia = {
  id: string
  servicoPredecessorId: string
  servicoSucessorId: string
  lagDias: number
  servicoPredecessor?: { name: string; color: string }
  servicoSucessor?: { name: string; color: string }
}

type Props = {
  atividades: Atividade[]
  dependencias?: Dependencia[]
}

const LABEL_W = 130
const ROW_H = 52
const PADDING_TOP = 40
const PADDING_BOT = 48
const CHART_W = 900

function statusColor(status?: string, serviceColor?: string): string {
  if (status === 'impedido') return '#ef4444'
  if (status === 'concluido') return '#10b981'
  if (status === 'em_andamento') return '#3b82f6'
  return serviceColor || '#94a3b8'
}

function statusLabel(status?: string): string {
  if (status === 'impedido') return 'Impedido'
  if (status === 'concluido') return 'Concluído'
  if (status === 'em_andamento') return 'Em Andamento'
  return 'Programado'
}

export default function LinhaBalanco({ atividades, dependencias = [] }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ativ: Atividade } | null>(null)
  const [showBaseline, setShowBaseline] = useState(false)

  const hasBaseline = useMemo(() => atividades.some(a => a.baselineInicio), [atividades])

  const locations = useMemo(() => {
    const map = new Map<string, { name: string; order: number; id: string }>()
    atividades.forEach(a => {
      if (!map.has(a.locationId) && a.location) {
        map.set(a.locationId, { ...a.location, id: a.locationId })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  }, [atividades])

  const services = useMemo(() => {
    const map = new Map<string, { name: string; color: string; id: string }>()
    atividades.forEach(a => {
      if (!map.has(a.serviceId) && a.service) {
        map.set(a.serviceId, { name: a.service.name, color: a.service.color, id: a.serviceId })
      }
    })
    return Array.from(map.values())
  }, [atividades])

  const timeRange = useMemo(() => {
    if (atividades.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 }
    const start = new Date(Math.min(...atividades.map(a => new Date(a.startDate).getTime())))
    const end = new Date(Math.max(...atividades.map(a => new Date(a.endDate).getTime())))
    start.setDate(start.getDate() - 7)
    end.setDate(end.getDate() + 14) // extra margin for ghost lines
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    return { start, end, totalDays }
  }, [atividades])

  const monthMarks = useMemo(() => {
    const marks: { label: string; x: number }[] = []
    const cursor = new Date(timeRange.start)
    cursor.setDate(1)
    cursor.setMonth(cursor.getMonth() + 1)
    while (cursor < timeRange.end) {
      const day = (cursor.getTime() - timeRange.start.getTime()) / 86400000
      marks.push({
        label: cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        x: LABEL_W + (day / timeRange.totalDays) * CHART_W
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return marks
  }, [timeRange])

  const todayX = useMemo(() => {
    const day = (new Date().getTime() - timeRange.start.getTime()) / 86400000
    if (day < 0 || day > timeRange.totalDays) return null
    return LABEL_W + (day / timeRange.totalDays) * CHART_W
  }, [timeRange])

  // Ghost lines: for each dependency, compute the projected (impacted) path of successor
  // Logic: for each location, find predecessor's actual endDate (if delayed), compute ghost start for successor
  const ghostLines = useMemo(() => {
    if (dependencias.length === 0) return []
    const today = new Date()
    const ghosts: { serviceId: string; color: string; points: { locId: string; ghostStart: Date; ghostEnd: Date }[] }[] = []

    dependencias.forEach(dep => {
      const predAtivs = atividades.filter(a => a.serviceId === dep.servicoPredecessorId)
      const sucAtivs = atividades.filter(a => a.serviceId === dep.servicoSucessorId)
      if (predAtivs.length === 0 || sucAtivs.length === 0) return

      const svc = services.find(s => s.id === dep.servicoSucessorId)
      if (!svc) return

      // For each location where both predecessor and successor exist
      const points: { locId: string; ghostStart: Date; ghostEnd: Date }[] = []

      locations.forEach(loc => {
        const pred = predAtivs.find(a => a.locationId === loc.id)
        const suc = sucAtivs.find(a => a.locationId === loc.id)
        if (!pred || !suc) return

        const predPlannedEnd = new Date(pred.endDate)
        // Estimate actual end: if behind schedule, project when it'll actually finish
        let predActualEnd = predPlannedEnd
        if (pred.status !== 'concluido' && pred.progress < 100) {
          // Project actual end from current velocity
          const elapsed = Math.max(1, (today.getTime() - new Date(pred.startDate).getTime()) / 86400000)
          const velocity = pred.progress / elapsed // %/day
          if (velocity > 0) {
            const daysLeft = (100 - pred.progress) / velocity
            predActualEnd = new Date(today.getTime() + daysLeft * 86400000)
          } else {
            // No progress at all — assume same pace as planned but shifted
            predActualEnd = new Date(today.getTime() + (predPlannedEnd.getTime() - new Date(pred.startDate).getTime()))
          }
        }

        // Only draw ghost if there is an actual delay (predActualEnd > predPlannedEnd + 1 day)
        const delayMs = predActualEnd.getTime() - predPlannedEnd.getTime()
        if (delayMs <= 86400000) return // less than 1 day delay, skip

        const lagMs = dep.lagDias * 86400000
        const sucOriginalStart = new Date(suc.startDate)
        const ghostStart = new Date(predActualEnd.getTime() + lagMs)

        // Ghost end: same duration as planned
        const sucDuration = new Date(suc.endDate).getTime() - sucOriginalStart.getTime()
        const ghostEnd = new Date(ghostStart.getTime() + sucDuration)

        points.push({ locId: loc.id, ghostStart, ghostEnd })
      })

      if (points.length > 0) {
        ghosts.push({ serviceId: dep.servicoSucessorId, color: svc.color, points })
      }
    })

    return ghosts
  }, [dependencias, atividades, locations, services])

  const chartH = PADDING_TOP + locations.length * ROW_H + PADDING_BOT
  const totalW = LABEL_W + CHART_W

  function dateToX(iso: string | Date) {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    const day = (d.getTime() - timeRange.start.getTime()) / 86400000
    return LABEL_W + (day / timeRange.totalDays) * CHART_W
  }
  function locToY(locId: string) {
    const idx = locations.findIndex(l => l.id === locId)
    return PADDING_TOP + idx * ROW_H + ROW_H / 2
  }

  if (atividades.length === 0) return null

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 flex items-start justify-between flex-wrap gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-blue-600" /> Linha de Balanço
          </h3>
          <p className="text-sm text-slate-400 font-medium mt-1">Ritmo de produção por local e tempo.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {hasBaseline && (
            <button
              onClick={() => setShowBaseline(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                showBaseline
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {showBaseline ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Baseline
            </button>
          )}
          {services.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-100">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Impedido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Concluído</span>
          </div>
          {ghostLines.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#f97316" strokeWidth="2" strokeDasharray="4 3" /></svg>
              <span className="text-[9px] font-black text-orange-400 uppercase">Impacto Previsto</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto px-4 pb-4">
        <svg
          viewBox={`0 0 ${totalW} ${chartH}`}
          width={totalW}
          height={chartH}
          className="block"
          style={{ minWidth: totalW }}
        >
          {/* Fundo */}
          <rect x={LABEL_W} y={0} width={CHART_W} height={chartH} fill="#f8fafc" rx="0" />

          {/* Linhas horizontais */}
          {locations.map((_, i) => (
            <line key={i} x1={LABEL_W} y1={PADDING_TOP + i * ROW_H} x2={totalW} y2={PADDING_TOP + i * ROW_H} stroke="#f1f5f9" strokeWidth="1" />
          ))}
          <line x1={LABEL_W} y1={PADDING_TOP + locations.length * ROW_H} x2={totalW} y2={PADDING_TOP + locations.length * ROW_H} stroke="#e2e8f0" strokeWidth="1" />

          {/* Marcas mensais */}
          {monthMarks.map((m, i) => (
            <g key={i}>
              <line x1={m.x} y1={PADDING_TOP} x2={m.x} y2={PADDING_TOP + locations.length * ROW_H} stroke="#f1f5f9" strokeWidth="1" />
              <text x={m.x + 4} y={PADDING_TOP + locations.length * ROW_H + 16} fontSize="9" fill="#94a3b8" fontWeight="700" textAnchor="start">
                {m.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Linha de Hoje */}
          {todayX !== null && (
            <g>
              <line x1={todayX} y1={PADDING_TOP - 8} x2={todayX} y2={PADDING_TOP + locations.length * ROW_H} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
              <rect x={todayX - 14} y={PADDING_TOP - 24} width={28} height={16} rx="4" fill="#ef4444" />
              <text x={todayX} y={PADDING_TOP - 13} fontSize="8" fill="white" fontWeight="800" textAnchor="middle">HOJE</text>
            </g>
          )}

          {/* Labels Eixo Y */}
          {locations.map((loc, i) => (
            <g key={loc.id}>
              <rect x={0} y={PADDING_TOP + i * ROW_H} width={LABEL_W - 8} height={ROW_H} fill="white" />
              <text x={LABEL_W - 12} y={PADDING_TOP + i * ROW_H + ROW_H / 2 + 4} fontSize="10" fill="#475569" fontWeight="700" textAnchor="end">
                {loc.name.length > 14 ? loc.name.slice(0, 13) + '…' : loc.name}
              </text>
            </g>
          ))}

          {/* ─── Baseline Lines (plano original em cinza) ─── */}
          {showBaseline && services.map(service => {
            const atvsBaseline = atividades
              .filter(a => a.serviceId === service.id && a.baselineInicio && locations.some(l => l.id === a.locationId))
              .sort((a, b) => {
                const ia = locations.findIndex(l => l.id === a.locationId)
                const ib = locations.findIndex(l => l.id === b.locationId)
                return ia - ib
              })

            if (atvsBaseline.length === 0) return null

            const pts = atvsBaseline.map(a => `${dateToX(a.baselineInicio!)},${locToY(a.locationId)}`).join(' ')

            return (
              <g key={`baseline-${service.id}`} opacity="0.5">
                {atvsBaseline.length >= 2 && (
                  <polyline points={pts} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {atvsBaseline.map(a => {
                  const bx1 = dateToX(a.baselineInicio!)
                  const bx2 = dateToX(a.baselineFim!)
                  const cy = locToY(a.locationId)
                  const bw = Math.max(bx2 - bx1, 4)
                  return (
                    <g key={`bl-${a.id}`}>
                      <rect x={bx1} y={cy - 6} width={bw} height={12} rx="3" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                      <circle cx={bx1} cy={cy} r="4" fill="#94a3b8" stroke="white" strokeWidth="1.5" />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* ─── Ghost Lines (impacto de dependências) ─── */}
          {ghostLines.map((ghost, gi) => {
            const sortedPts = ghost.points
              .filter(p => locations.some(l => l.id === p.locId))
              .sort((a, b) => locations.findIndex(l => l.id === a.locId) - locations.findIndex(l => l.id === b.locId))

            if (sortedPts.length === 0) return null
            const ptsStr = sortedPts.map(p => `${dateToX(p.ghostStart)},${locToY(p.locId)}`).join(' ')

            return (
              <g key={`ghost-${gi}`}>
                {/* Ghost polyline */}
                <polyline points={ptsStr} fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="8 5" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />

                {/* Ghost bars per location */}
                {sortedPts.map((p, pi) => {
                  const gx1 = dateToX(p.ghostStart)
                  const gx2 = dateToX(p.ghostEnd)
                  const cy = locToY(p.locId)
                  const bw = Math.max(gx2 - gx1, 4)
                  return (
                    <g key={pi}>
                      <rect x={gx1} y={cy - 6} width={bw} height={12} rx="3" fill="#f97316" opacity="0.12" />
                      <rect x={gx1} y={cy - 6} width={bw} height={12} rx="3" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
                      <circle cx={gx1} cy={cy} r="5" fill="white" stroke="#f97316" strokeWidth="2" opacity="0.9" />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* ─── Linhas de Balanço por Serviço ─── */}
          {services.map(service => {
            const atvsDoServico = atividades
              .filter(a => a.serviceId === service.id)
              .filter(a => locations.some(l => l.id === a.locationId))
              .sort((a, b) => {
                const ia = locations.findIndex(l => l.id === a.locationId)
                const ib = locations.findIndex(l => l.id === b.locationId)
                return ia - ib
              })

            if (atvsDoServico.length < 2) {
              return (
                <g key={service.id}>
                  {atvsDoServico.map(a => {
                    const cx = dateToX(a.startDate)
                    const cy = locToY(a.locationId)
                    const cor = statusColor(a.status, service.color)
                    return (
                      <circle key={a.id} cx={cx} cy={cy} r="7" fill={cor} stroke="white" strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setTooltip({ x: cx, y: cy, ativ: a })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </g>
              )
            }

            const pts = atvsDoServico.map(a => `${dateToX(a.startDate)},${locToY(a.locationId)}`).join(' ')

            return (
              <g key={service.id}>
                <polyline points={pts} fill="none" stroke={service.color} strokeWidth="10" opacity="0.08" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={pts} fill="none" stroke={service.color} strokeWidth="3" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />

                {atvsDoServico.map(a => {
                  const x1 = dateToX(a.startDate)
                  const x2 = dateToX(a.endDate)
                  const cy = locToY(a.locationId)
                  const cor = statusColor(a.status, service.color)
                  const barW = Math.max(x2 - x1, 4)
                  return (
                    <g key={a.id}>
                      <rect x={x1} y={cy - 8} width={barW} height={16} rx="4" fill={cor} opacity="0.15" />
                      <rect x={x1} y={cy - 8} width={barW * (a.progress / 100)} height={16} rx="4" fill={cor} opacity="0.4" />
                      <circle cx={x1} cy={cy} r="6" fill={cor} stroke="white" strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setTooltip({ x: x1, y: cy, ativ: a })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      <circle cx={x2} cy={cy} r="4" fill={cor} stroke="white" strokeWidth="2" opacity="0.6" />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const { x, y, ativ } = tooltip
            const cor = statusColor(ativ.status, ativ.service?.color)
            const W = 180; const H = 72
            const tx = Math.min(x + 12, totalW - W - 8)
            const ty = Math.max(y - H - 8, 8)
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx} y={ty} width={W} height={H} rx="10" fill="white"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                />
                <rect x={tx} y={ty} width={4} height={H} rx="2" fill={cor} />
                <text x={tx + 12} y={ty + 18} fontSize="10" fontWeight="800" fill="#0f172a">
                  {ativ.name.length > 22 ? ativ.name.slice(0, 21) + '…' : ativ.name}
                </text>
                <text x={tx + 12} y={ty + 34} fontSize="9" fill="#64748b" fontWeight="600">
                  {new Date(ativ.startDate).toLocaleDateString('pt-BR')} → {new Date(ativ.endDate).toLocaleDateString('pt-BR')}
                </text>
                <rect x={tx + 12} y={ty + 42} width={100} height={6} rx="3" fill="#f1f5f9" />
                <rect x={tx + 12} y={ty + 42} width={ativ.progress} height={6} rx="3" fill={cor} />
                <text x={tx + 118} y={ty + 50} fontSize="9" fontWeight="800" fill={cor}>{ativ.progress}%</text>
                <rect x={tx + 12} y={ty + 56} width={52} height={12} rx="4" fill={cor} opacity="0.15" />
                <text x={tx + 38} y={ty + 65} fontSize="8" fontWeight="800" fill={cor} textAnchor="middle">
                  {statusLabel(ativ.status).toUpperCase()}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Legenda rodapé */}
      <div className="px-10 py-6 bg-blue-50/30 border-t border-slate-50 flex items-start gap-4">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700/60 font-medium leading-relaxed">
          <strong className="text-blue-800">Leitura:</strong> Cada linha conecta o mesmo serviço pelos diferentes locais.
          A <strong>inclinação</strong> indica o ritmo — linhas paralelas = fluxo sincronizado (ideal).
          Pontos <span className="text-red-500 font-black">vermelhos</span> indicam impedimento.
          {showBaseline && hasBaseline && <> Linhas <span className="text-slate-500 font-black">cinzas tracejadas</span> mostram o plano original (Baseline).</>}
          {ghostLines.length > 0 && <> Linhas <span className="text-orange-500 font-black">laranja tracejadas</span> mostram o impacto projetado de atrasos em serviços dependentes.</>}
          {' '}Passe o mouse sobre um ponto para ver detalhes.
        </p>
      </div>
    </div>
  )
}
