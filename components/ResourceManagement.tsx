'use client'

import { useState, useEffect } from 'react'
import { 
  Users2, Hammer, Shield, Construction, Trash2, Plus, 
  Building2, UserCircle, ChevronDown, X 
} from 'lucide-react'

type Resource = {
  id: string
  name: string
  type: 'EMPREITEIRA' | 'FUNCIONARIO'
  role: string | null
  companyName: string | null
  hourlyRate: number
}

export default function ResourceManagement() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'EMPREITEIRA' | 'FUNCIONARIO'>('EMPREITEIRA')
  const [newRole, setNewRole] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newRate, setNewRate] = useState<string>('')

  useEffect(() => {
    fetch('/api/resources')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setResources(data)
        setLoading(false)
      })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        type: newType,
        role: newRole || null,
        companyName: newType === 'EMPREITEIRA' ? newCompany || newName : null,
        hourlyRate: Number(newRate) || 0
      })
    })
    if (res.ok) {
      const saved = await res.json()
      setResources([...resources, saved])
      setShowAdd(false)
      setNewName(''); setNewRole(''); setNewCompany(''); setNewRate('')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir este recurso? Isso não removerá o histórico, mas ele não poderá mais ser vinculado a novas tarefas.')) return
    const res = await fetch(`/api/resources?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setResources(resources.filter(r => r.id !== id))
    }
  }

  if (loading) return (
    <div className="p-20 text-center animate-pulse">
       <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
       <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sincronizando Recursos...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Capital Humano</p>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recursos & Equipes</h1>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Recurso
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 animate-in zoom-in-95">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-2">
                    {newType === 'EMPREITEIRA' ? <Building2 className="w-4 h-4 text-amber-500" /> : <UserCircle className="w-4 h-4 text-blue-500" />}
                    {newType === 'EMPREITEIRA' ? 'Empreiteira' : 'Funcionário (CLT)'}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSelectOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      type="button"
                      onClick={() => { setNewType('EMPREITEIRA'); setIsSelectOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left hover:bg-slate-50 transition-colors ${newType === 'EMPREITEIRA' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}
                    >
                      <Building2 className={`w-4 h-4 ${newType === 'EMPREITEIRA' ? 'text-amber-500' : 'text-slate-400'}`} />
                      Empreiteira
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewType('FUNCIONARIO'); setIsSelectOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left hover:bg-slate-50 transition-colors ${newType === 'FUNCIONARIO' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}
                    >
                      <UserCircle className={`w-4 h-4 ${newType === 'FUNCIONARIO' ? 'text-blue-500' : 'text-slate-400'}`} />
                      Funcionário (CLT)
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Recurso / Responsável</label>
              <input 
                placeholder="Ex: João da Silva ou Pinturas Express"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Especialidade</label>
              <input 
                placeholder="Ex: Engenheiro, Mestre de Obras..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Hora (R$)</label>
              <input 
                type="number"
                placeholder="Ex: 25.00"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all">Salvar Recurso</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </form>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-20 text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-500">
              <Users2 className="w-10 h-10" />
           </div>
           <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Nenhuma Equipe Cadastrada</h2>
           <p className="text-slate-400 font-medium max-w-md mx-auto mb-10">
              Comece cadastrando as empreiteiras e funcionários para atrelar às atividades do cronograma.
           </p>
           <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Adicionar Primeiro Recurso</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resources.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${r.type === 'EMPREITEIRA' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                  {r.type === 'EMPREITEIRA' ? <Building2 className="w-6 h-6" /> : <UserCircle className="w-6 h-6" />}
                </div>
                <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.type}</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{r.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                {r.role && <p className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-wider">{r.role}</p>}
                <p className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">R$ {r.hourlyRate.toFixed(2)}/h</p>
              </div>
              
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Ativo no Workspace</span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Footer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Total de Recursos</p>
          <div className="text-4xl font-black">{resources.length}</div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empreiteiras</p>
          <div className="text-4xl font-black text-slate-800">{resources.filter(r => r.type === 'EMPREITEIRA').length}</div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipe Direta</p>
          <div className="text-4xl font-black text-slate-800">{resources.filter(r => r.type === 'FUNCIONARIO').length}</div>
        </div>
      </div>
    </div>
  )
}
