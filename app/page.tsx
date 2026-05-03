'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  Building2, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  User,
  MapPin,
  AlertTriangle
} from 'lucide-react'

const WORKSPACE_ID = 'workspace-1'

type Obra = {
  id: string
  nome: string
  descricao?: string
  endereco?: string
  engenheiro?: string
  stats: {
    progresso: number
    progressoPlanejado: number
    desvio: number
    totalAtividades: number
    status: string
  }
}

export default function PortfolioPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filtro, setFiltro] = useState('')

  async function fetchObras() {
    try {
      const res = await fetch(`/api/obras?workspaceId=${WORKSPACE_ID}`)
      const data = await res.json()
      setObras(data)
    } catch {
      // silenciar erro
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObras()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: name, descricao: description, workspaceId: WORKSPACE_ID }),
      })
      setName(''); setDescription(''); setShowModal(false)
      fetchObras()
    } finally {
      setSubmitting(false)
    }
  }

  const obrasFiltradas = obras.filter(o => o.nome.toLowerCase().includes(filtro.toLowerCase()))
  const mediaProgresso = obras.length > 0 ? Math.round(obras.reduce((acc, o) => acc + o.stats.progresso, 0) / obras.length) : 0
  const emAlerta = obras.filter(o => o.stats.status === 'Crítico' || o.stats.status === 'Atenção').length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen bg-slate-50/20">
      
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Torre de Controle</h1>
          <p className="text-slate-500 font-medium mt-1 text-lg">Visão consolidada do seu portfólio de engenharia.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar obra..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-black px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-blue-100"
          >
            <Plus className="w-5 h-5" />
            Nova Obra
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <Building2 className="w-8 h-8" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obras Ativas</p>
             <h3 className="text-3xl font-black text-slate-800">{obras.length}</h3>
           </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
           <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <Activity className="w-8 h-8" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média de Avanço</p>
             <h3 className="text-3xl font-black text-slate-800">{mediaProgresso}%</h3>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
           <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <AlertCircle className="w-8 h-8" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obras em Alerta</p>
             <h3 className="text-3xl font-black text-slate-800">{emAlerta}</h3>
           </div>
        </div>
      </div>

      {/* Grid de Obras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[3rem]" />
          ))
        ) : obrasFiltradas.map((obra) => (
          <Link
            key={obra.id}
            href={`/obras/${obra.id}`}
            className="group bg-white border border-slate-100 rounded-[3rem] p-10 hover:border-blue-200 hover:shadow-2xl transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10">
              <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-45 transition-all">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>

            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    obra.stats.status === 'Saudável' || obra.stats.status === 'Concluída' ? 'bg-emerald-500' : 
                    obra.stats.status === 'Atenção' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                  }`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{obra.stats.status}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {obra.nome}
                </h2>
                <div className="flex items-center gap-6 mt-4 text-sm text-slate-400 font-bold">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-300" />
                    {obra.engenheiro || 'Eng. Responsável'}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-300" />
                    {obra.endereco || 'Localização'}
                  </span>
                </div>
              </div>

              <div className="mt-12">
                <div className="flex justify-between items-end mb-3">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execução Física</p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5">Meta Planejada: {obra.stats.progressoPlanejado}%</p>
                   </div>
                   <p className="text-xl font-black text-slate-900">{obra.stats.progresso}%</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${obra.stats.desvio < -5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]'}`} 
                     style={{ width: `${obra.stats.progresso}%` }} 
                   />
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-6">
                  <div className="flex items-center gap-2">
                     {obra.stats.desvio < -10 ? (
                       <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase"><AlertTriangle className="w-4 h-4" /> Atraso Crítico ({obra.stats.desvio}%)</div>
                     ) : obra.stats.desvio < 0 ? (
                       <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase"><AlertCircle className="w-4 h-4" /> Desvio ({obra.stats.desvio}%)</div>
                     ) : (
                       <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase"><CheckCircle2 className="w-4 h-4" /> No Prazo</div>
                     )}
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-2 transition-transform flex items-center gap-1">Entrar na Obra <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Modal Nova Obra */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8">
              <Building2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Iniciar Nova Obra</h2>
            <p className="text-slate-500 font-medium text-sm mb-10">Configure os parâmetros base para o monitoramento inteligente.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nome do Projeto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Edifício Horizonte"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all"
                >
                  {submitting ? 'Criando...' : 'Criar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
