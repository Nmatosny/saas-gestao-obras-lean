'use client'

import { useState, useMemo, useRef } from 'react'
import { 
  Calendar, Search, ZoomIn, ZoomOut, Maximize2, 
  ChevronRight, ChevronDown, List, Link2, Filter,
  Settings2, Download, Package, FileText
} from 'lucide-react'

type Atividade = {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  isCritical?: boolean
  outlineLevel: number
  isSummary: boolean
  parentId: string | null
  wbs?: string
  service?: { id: string, name: string, color: string }
  location?: { id: string, name: string }
}

type Dependency = {
  id: string
  predecessorId: string
  sucessorId: string
}

type Props = {
  atividades: Atividade[]
  dependencias?: Dependency[]
  onUpdateAtividade?: (id: string, data: Record<string, unknown>) => void
}

const COLUMN_WIDTHS = {
  wbs: 60,
  id: 40,
  name: 300,
  duration: 80,
  start: 100,
  end: 100
}

const ROW_HEIGHT = 42
const DAY_WIDTH_MONTH = 24 
const DAY_WIDTH_WEEK = 80

export default function CronogramaGantt({ atividades, dependencias = [] }: Props) {
  const [zoom, setZoom] = useState<'month' | 'week'>('month')
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)
  
  const dayWidth = zoom === 'month' ? DAY_WIDTH_MONTH : DAY_WIDTH_WEEK

  // Hierarchical Logic: Build a real tree and flatten it recursively
  const { flatList, minDate, maxDate, totalDays } = useMemo(() => {
    if (atividades.length === 0) return { flatList: [], minDate: new Date(), maxDate: new Date(), totalDays: 0 }

    // 1. Map all items for quick lookup
    const itemMap = new Map<string, any>()
    atividades.forEach(a => itemMap.set(a.id, { ...a, children: [] }))

    // 2. Build Tree
    const rootNodes: any[] = []
    itemMap.forEach(item => {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId).children.push(item)
      } else {
        rootNodes.push(item)
      }
    })

    // 3. Recursive Flattening with sorting by WBS or Name
    const flat: any[] = []
    const flatten = (nodes: any[], depth: number = 0) => {
      // Sort nodes at this level
      const sorted = [...nodes].sort((a, b) => {
        const aWBS = a.wbs || ''
        const bWBS = b.wbs || ''
        if (aWBS && bWBS) return aWBS.localeCompare(bWBS, undefined, { numeric: true })
        return a.name.localeCompare(b.name)
      })

      sorted.forEach(node => {
        const duration = Math.ceil((new Date(node.endDate).getTime() - new Date(node.startDate).getTime()) / 86400000)
        flat.push({ ...node, depth, duration: duration > 0 ? duration : 0 })
        
        // Only flatten children if not collapsed
        if (!collapsedTasks.has(node.id) && node.children.length > 0) {
          flatten(node.children, depth + 1)
        }
      })
    }

    flatten(rootNodes, 0)

    // 4. Time range
    const allDates = atividades.flatMap(a => [new Date(a.startDate).getTime(), new Date(a.endDate).getTime()])
    const start = new Date(Math.min(...allDates))
    const end = new Date(Math.max(...allDates))
    start.setDate(start.getDate() - 5)
    end.setDate(end.getDate() + 15)
    
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000)

    return { flatList: flat, minDate: start, maxDate: end, totalDays: days }
  }, [atividades, collapsedTasks])

  const dateToX = (date: string | Date) => {
    const d = new Date(date)
    const diff = d.getTime() - minDate.getTime()
    return (diff / 86400000) * dayWidth
  }

  const toggleCollapse = (id: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-700">
      
      {/* PROFESSIONAL TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 text-slate-400">
              <List className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cronograma Estruturado</span>
           </div>
           <div className="h-4 w-px bg-slate-200" />
           <div className="flex items-center gap-1">
              <button onClick={() => setZoom('month')} className={`p-2 rounded-lg transition-all ${zoom === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => setZoom('week')} className={`p-2 rounded-lg transition-all ${zoom === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><ZoomIn className="w-4 h-4" /></button>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input placeholder="Filtrar tarefas..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
           </div>
           <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"><Settings2 className="w-4 h-4" /></button>
           <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-200"><Download className="w-3.5 h-3.5" /> Exportar</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT DATA TABLE */}
        <div className="flex flex-col border-r border-slate-200 bg-white shrink-0 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)] z-20">
           {/* Table Header */}
           <div className="flex h-16 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <div style={{ width: COLUMN_WIDTHS.wbs }} className="flex items-center px-4 border-r border-slate-100">WBS</div>
              <div style={{ width: COLUMN_WIDTHS.id }} className="flex items-center px-2 border-r border-slate-100 text-center justify-center">ID</div>
              <div style={{ width: COLUMN_WIDTHS.name }} className="flex items-center px-4 border-r border-slate-100">Nome da Tarefa</div>
              <div style={{ width: COLUMN_WIDTHS.duration }} className="flex items-center px-2 border-r border-slate-100 text-center justify-center">Duração</div>
              <div style={{ width: COLUMN_WIDTHS.start }} className="flex items-center px-4">Início</div>
           </div>
           {/* Table Body */}
           <div className="flex-1 overflow-y-auto no-scrollbar">
              {flatList.map((row, i) => (
                <div 
                  key={row.id} 
                  className={`flex h-[42px] border-b border-slate-50 items-center text-[11px] font-medium transition-colors hover:bg-blue-50/30 ${row.isSummary ? 'bg-slate-50/50 font-black' : 'bg-white'}`}
                >
                   <div style={{ width: COLUMN_WIDTHS.wbs }} className="px-4 text-slate-400 font-mono text-[10px]">{row.wbs}</div>
                   <div style={{ width: COLUMN_WIDTHS.id }} className="px-2 text-center text-slate-300">{i + 1}</div>
                   <div 
                     style={{ width: COLUMN_WIDTHS.name, paddingLeft: 16 + (row.depth * 20) }} 
                     className="px-4 flex items-center gap-2 truncate"
                   >
                      {row.isSummary ? (
                        <button onClick={() => toggleCollapse(row.id)} className="p-0.5 hover:bg-slate-200 rounded transition-colors shrink-0">
                          {collapsedTasks.has(row.id) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ) : <div className="w-4 shrink-0" />}
                      
                      {row.isSummary ? (
                        <Package className={`w-3.5 h-3.5 shrink-0 ${collapsedTasks.has(row.id) ? 'text-slate-400' : 'text-blue-500'}`} />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      
                      <span className={row.isSummary ? 'text-slate-900' : 'text-slate-600'}>{row.name}</span>
                   </div>
                   <div style={{ width: COLUMN_WIDTHS.duration }} className="px-2 text-center text-slate-400">{row.duration || '-'} d</div>
                   <div style={{ width: COLUMN_WIDTHS.start }} className="px-4 text-slate-500">{new Date(row.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                </div>
              ))}
           </div>
        </div>

        {/* RIGHT TIMELINE */}
        <div className="flex-1 overflow-auto relative bg-slate-50/30" ref={timelineRef}>
           <div className="relative" style={{ width: totalDays * dayWidth }}>
              
              {/* Timeline Header */}
              <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                {/* Level 1: Months */}
                <div className="flex h-8 border-b border-slate-100">
                   {useMemo(() => {
                      const months = []
                      let currentMonth = -1
                      let currentWidth = 0
                      let lastDate = null
                      for (let i = 0; i <= totalDays; i++) {
                         const d = new Date(minDate.getTime() + i * 86400000)
                         if (d.getMonth() !== currentMonth) {
                            if (currentMonth !== -1) months.push({ label: lastDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), width: currentWidth })
                            currentMonth = d.getMonth()
                            currentWidth = 0
                         }
                         currentWidth += dayWidth
                         lastDate = d
                      }
                      months.push({ label: lastDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), width: currentWidth })
                      return months.map((m, i) => (
                        <div key={i} style={{ width: m.width }} className="shrink-0 border-r border-slate-100 flex items-center px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/80">
                          {m.label}
                        </div>
                      ))
                   }, [totalDays, dayWidth, minDate])}
                </div>
                {/* Level 2: Days/Weeks */}
                <div className="flex h-8">
                   {Array.from({ length: totalDays + 1 }).map((_, i) => {
                      const d = new Date(minDate.getTime() + i * 86400000)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <div key={i} style={{ width: dayWidth }} className={`shrink-0 border-r border-slate-50 flex items-center justify-center text-[9px] font-bold ${isWeekend ? 'bg-slate-100/50 text-slate-300' : 'text-slate-500'}`}>
                          {zoom === 'week' ? d.getDate() : d.getDate() === 1 || i === 0 ? d.getDate() : ''}
                        </div>
                      )
                   })}
                </div>
              </div>

              {/* Grid Background */}
              <div className="absolute inset-0 pointer-events-none flex" style={{ paddingTop: 64 }}>
                {Array.from({ length: totalDays + 1 }).map((_, i) => {
                  const d = new Date(minDate.getTime() + i * 86400000)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={i} style={{ width: dayWidth }} className={`h-full border-r border-slate-100/30 ${isWeekend ? 'bg-slate-100/20' : ''}`} />
                  )
                })}
              </div>

              {/* CONTENT: BARS & CONNECTORS */}
              <div className="relative pt-[64px]">
                 
                 {/* SVG Dependency Layer */}
                 <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: flatList.length * ROW_HEIGHT }}>
                    <defs>
                       <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orientation="auto">
                          <path d="M0,0 L10,4 L0,8 Z" fill="#f97316" />
                       </marker>
                    </defs>
                    {dependencias.map(dep => {
                       const pIdx = flatList.findIndex(r => r.id === dep.predecessorId)
                       const sIdx = flatList.findIndex(r => r.id === dep.sucessorId)
                       if (pIdx === -1 || sIdx === -1) return null
                       
                       const pred = flatList[pIdx]
                       const suc = flatList[sIdx]
                       
                       const x1 = dateToX(pred.endDate)
                       const y1 = pIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                       const x2 = dateToX(suc.startDate)
                       const y2 = sIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                       
                       // Orthogonal path like MS Project
                       const midX = x1 + (x2 - x1) / 2
                       const path = `M ${x1} ${y1} L ${x1 + 12} ${y1} L ${x1 + 12} ${y2} L ${x2} ${y2}`
                       
                       return <path key={dep.id} d={path} fill="none" stroke="#f97316" strokeWidth="1.2" markerEnd="url(#arrow)" strokeOpacity="0.6" />
                    })}
                 </svg>

                 {/* Bars Layer */}
                 {flatList.map((row, i) => {
                    if (row.isSummary) {
                       const x = dateToX(row.startDate)
                       const width = Math.max(dateToX(row.endDate) - x, 4)
                       return (
                         <div key={row.id} className="h-[42px] relative flex items-center">
                            <div className="absolute h-1.5 bg-slate-900 rounded-full" style={{ left: x, width }}>
                               <div className="absolute left-0 top-0 bottom-0 w-px h-3 bg-slate-900 -translate-y-1/2" />
                               <div className="absolute right-0 top-0 bottom-0 w-px h-3 bg-slate-900 -translate-y-1/2" />
                            </div>
                         </div>
                       )
                    }

                    const x = dateToX(row.startDate)
                    const width = Math.max(dateToX(row.endDate) - x, 8)
                    const color = row.service?.color || '#3b82f6'

                    return (
                      <div key={row.id} className="h-[42px] relative flex items-center group">
                         <div 
                           className="absolute h-6 rounded-md shadow-sm flex items-center overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
                           style={{ left: x, width, backgroundColor: `${color}20`, border: `1.5px solid ${color}` }}
                         >
                            {/* Progress bar */}
                            <div className="h-full bg-current opacity-80" style={{ width: `${row.progress}%`, color }} />
                            
                            {/* Label */}
                            <span className="absolute left-full ml-3 text-[9px] font-black text-slate-400 whitespace-nowrap uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                               {row.progress}% • {row.name}
                            </span>
                         </div>
                      </div>
                    )
                 })}
              </div>
           </div>
        </div>

      </div>

      {/* FOOTER LEGEND */}
      <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center gap-8">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Execução Normal</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-slate-900 relative">
               <div className="absolute left-0 -top-1 w-px h-2 bg-slate-900" />
               <div className="absolute right-0 -top-1 w-px h-2 bg-slate-900" />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarefa Resumo (WBS)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-orange-500 opacity-60" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dependência (FS)</span>
         </div>
         <div className="ml-auto flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Ajuste de Zoom Ativo</span>
         </div>
      </div>
    </div>
  )
}
