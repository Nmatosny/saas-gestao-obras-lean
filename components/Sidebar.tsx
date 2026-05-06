'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  ChevronDown, LayoutDashboard, 
  BookOpen, ListTodo, CalendarClock, 
  GanttChartSquare, Ruler, 
  Settings, LogOut,
  Users, HardHat, 
  Briefcase, BarChart3, 
  Layers, ChevronRight,
  AlertTriangle, Building2, Lock
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const [showWarning, setShowWarning] = useState(false)
  
  if (pathname === '/login' || pathname === '/register') return null

  const isObraRoute = pathname.startsWith('/obras/') && pathname !== '/obras'
  const obraId = isObraRoute ? pathname.split('/')[2] : null
  const currentAba = searchParams.get('aba') || 'overview'

  const NAV_GROUPS = [
    {
      title: 'Estratégico',
      items: [
        { label: 'Obras', icon: Building2, href: '/', match: 'portfolio' },
        { label: 'Indicadores', icon: BarChart3, href: obraId ? `/obras/${obraId}?aba=controladoria` : '#', match: 'controladoria', needsObra: true },
        { label: 'Gestão de Equipe', icon: Users, href: '/equipe', match: 'equipe' },
      ]
    },
    {
      title: 'Planejamento',
      items: [
        { label: 'Linha de Balanço', icon: Layers, href: obraId ? `/obras/${obraId}?aba=linha-balanco` : '#', match: 'linha-balanco', needsObra: true },
        { label: 'Cronograma Gantt', icon: GanttChartSquare, href: obraId ? `/obras/${obraId}?aba=cronograma` : '#', match: 'cronograma', needsObra: true },
        { label: 'Tarefas', icon: ListTodo, href: obraId ? `/obras/${obraId}?aba=planejamento` : '#', match: 'planejamento', needsObra: true },
        { label: 'Programações', icon: CalendarClock, href: obraId ? `/obras/${obraId}?aba=programacao` : '#', match: 'programacao', needsObra: true },
      ]
    },
    {
      title: 'Canteiro de Obra',
      items: [
        { label: 'Diário de Obra', icon: BookOpen, href: obraId ? `/obras/${obraId}?aba=campo` : '#', match: 'campo', needsObra: true },
        { label: 'Não Conformidade', icon: AlertTriangle, href: obraId ? `/obras/${obraId}?aba=cnc` : '#', match: 'cnc', needsObra: true },
      ]
    }
  ]

  return (
    <aside className="hidden lg:flex w-72 bg-[#0F172A] h-screen sticky top-0 flex-col border-r border-slate-800 shrink-0 z-50 overflow-hidden">
      
      {/* BRANDING & PROJECT SWITCHER */}
      <div className="p-8 pb-6">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <HardHat className="text-white w-6 h-6" />
           </div>
           <div>
              <h2 className="text-white font-black tracking-tighter text-lg leading-none">ANTIGRAVITY</h2>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">SaaS Engineering</p>
           </div>
        </div>

        {isObraRoute ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 group cursor-pointer hover:bg-slate-800/60 transition-all">
             <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                <Briefcase className="w-4 h-4 text-blue-400" />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Projeto Ativo</p>
                <p className="text-xs font-bold text-white truncate">{mounted ? (session?.user?.workspaceId === 'demo' ? '[DEMO] Residencial Horizonte' : 'Obra em Andamento') : 'Obra em Andamento'}</p>
             </div>
             <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
          </div>
        ) : (
          <Link href="/" className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 group hover:bg-blue-600/20 transition-all animate-pulse">
             <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <Building2 className="w-4 h-4 text-blue-400" />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Selecione uma Obra</p>
                <p className="text-[10px] font-bold text-slate-400">Ir para o Portfólio</p>
             </div>
             <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
          </Link>
        )}
      </div>

      {/* NAVIGATION SECTIONS */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 no-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isLocked = item.needsObra && !obraId
                const isActive = isObraRoute ? currentAba === item.match : (item.match === 'portfolio' && pathname === '/')
                const Icon = item.icon

                return (
                  <Link
                    key={item.label}
                    href={isLocked ? '#' : item.href}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault()
                        alert('🚧 Por favor, selecione uma obra no Portfólio para acessar este módulo.')
                      }
                    }}
                    className={`
                      group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : isLocked 
                          ? 'text-slate-600 cursor-not-allowed opacity-60' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : isLocked ? 'text-slate-700' : 'text-slate-500 group-hover:text-blue-400'}`} />
                    <span className="flex-1">{item.label}</span>
                    {isLocked && <Lock className="w-3 h-3 text-slate-700" />}
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER: USER & LOGOUT */}
      <div className="p-6 bg-slate-900/50 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-6 px-2">
           <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
              <span className="text-sm font-black text-blue-400">{mounted ? (session?.user?.name?.[0] || 'N') : 'N'}</span>
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{mounted ? (session?.user?.name || 'Engenheiro') : 'Engenheiro'}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Responsável Técnico</p>
           </div>
           <button className="p-2 text-slate-500 hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
           </button>
        </div>

        <button 
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Sair da Plataforma
        </button>
      </div>
    </aside>
  )
}
