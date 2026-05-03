'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  LayoutDashboard, 
  HardHat, 
  BarChart3, 
  Users2, 
  LogOut,
  Building2,
  FileText
} from 'lucide-react'

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Torre de Controle', icon: LayoutDashboard, href: '/' },
  { id: 'obras',     label: 'Obras & Engenharia', icon: Building2,      href: '/obras' },
  { id: 'insights',  label: 'Análise de Avanço',  icon: BarChart3,      href: '/insights' },
  { id: 'equipe',    label: 'Recursos & Equipes', icon: Users2,         href: '/equipe' },
  { id: 'docs',      label: 'Documentos Técnicos', icon: FileText,       href: '/docs' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Ocultar sidebar em telas de login e registro
  if (pathname === '/login' || pathname === '/register') return null

  return (
    <aside className="w-64 bg-[#0F172A] h-screen sticky top-0 flex flex-col border-r border-slate-800/50 text-slate-300">
      {/* Logo Area */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <HardHat className="text-white w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-black tracking-tight leading-none text-base">ANTIGRAVITY</span>
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">SaaS Engineering</span>
        </div>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all
                ${isActive 
                  ? 'bg-slate-800 text-white border-l-4 border-blue-600 rounded-l-none' 
                  : 'hover:bg-slate-800/50 hover:text-white'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-slate-800/50">
        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Usuário Logado</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-blue-600/30">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{session?.user?.name || 'Usuário'}</span>
               <span className="text-[9px] text-slate-500">Engenheiro Responsável</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-4 py-2 w-full text-xs font-bold hover:text-white transition-colors group"
        >
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400" />
          Encerrar Sessão
        </button>
      </div>
    </aside>
  )
}
