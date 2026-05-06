'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  Building2, ListTodo, CalendarClock, 
  Layers, BarChart3, BookOpen
} from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  if (pathname === '/login' || pathname === '/register') return null

  const isObraRoute = pathname.startsWith('/obras/') && pathname !== '/obras'
  const obraId = isObraRoute ? pathname.split('/')[2] : null
  const currentAba = searchParams.get('aba') || 'overview'

  const navItems = [
    { label: 'Obras', icon: Building2, href: '/', match: 'portfolio' },
    { label: 'Planejamento', icon: ListTodo, href: obraId ? `/obras/${obraId}?aba=planejamento` : '#', match: 'planejamento', needsObra: true },
    { label: 'Execução', icon: CalendarClock, href: obraId ? `/obras/${obraId}?aba=programacao` : '#', match: 'programacao', needsObra: true },
    { label: 'Diário', icon: BookOpen, href: obraId ? `/obras/${obraId}?aba=campo` : '#', match: 'campo', needsObra: true },
    { label: 'Indicadores', icon: BarChart3, href: obraId ? `/obras/${obraId}?aba=controladoria` : '#', match: 'controladoria', needsObra: true },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 px-2 py-2 flex items-center justify-around z-[100] safe-area-bottom pb-4">
      {navItems.map((item) => {
        const isLocked = item.needsObra && !obraId
        const isActive = isObraRoute ? currentAba === item.match : (item.match === 'portfolio' && pathname === '/')
        const Icon = item.icon

        return (
          <Link
            key={item.label}
            href={isLocked ? '#' : item.href}
            className={`
              flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all
              ${isActive 
                ? 'text-white' 
                : 'text-slate-500'
              }
              ${isLocked ? 'opacity-30 grayscale' : ''}
            `}
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center transition-all
              ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : 'bg-transparent'}
            `}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
