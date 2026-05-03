'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Plus, Trash2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'

type Service = { id: string; name: string; color: string }
type Dependencia = {
  id: string
  servicoPredecessorId: string
  servicoSucessorId: string
  lagDias: number
  servicoPredecessor: Service
  servicoSucessor: Service
}

type Props = {
  obraId: string
}

export default function DependenciasServico({ obraId }: Props) {
  const [services, setServices] = useState<Service[]>([])
  const [deps, setDeps] = useState<Dependencia[]>([])
  const [loading, setLoading] = useState(true)
  const [predId, setPredId] = useState('')
  const [sucId, setSucId] = useState('')
  const [lagDias, setLagDias] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [obraId])

  async function carregar() {
    setLoading(true)
    try {
      const [svcRes, depRes] = await Promise.all([
        fetch(`/api/services?obraId=${obraId}`),
        fetch(`/api/dependencias?obraId=${obraId}`)
      ])
      if (svcRes.ok) setServices(await svcRes.json())
      if (depRes.ok) setDeps(await depRes.json())
    } finally {
      setLoading(false)
    }
  }

  async function criar() {
    if (!predId || !sucId) return
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/dependencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obraId, servicoPredecessorId: predId, servicoSucessorId: sucId, lagDias })
      })
      const data = await res.json()
      if (res.ok) {
        setDeps(prev => [...prev, data])
        setPredId(''); setSucId(''); setLagDias(0)
      } else {
        setErro(data.error || 'Erro ao criar dependência')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    const res = await fetch(`/api/dependencias?id=${id}`, { method: 'DELETE' })
    if (res.ok) setDeps(prev => prev.filter(d => d.id !== id))
  }

  // Detect circular: can't add B→A if A→B already exists (simple 1-level check)
  const existingPairs = new Set(deps.map(d => `${d.servicoPredecessorId}→${d.servicoSucessorId}`))
  const wouldCreateCycle = predId && sucId && existingPairs.has(`${sucId}→${predId}`)
  const isInvalid = !predId || !sucId || predId === sucId || !!wouldCreateCycle

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (services.length < 2) return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
      <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-4" />
      <p className="text-sm font-black text-slate-500">Crie pelo menos 2 serviços para definir dependências.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 flex items-center justify-between border-b border-slate-50">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-blue-600" /> Malha de Dependências
          </h3>
          <p className="text-sm text-slate-400 font-medium mt-1">
            Define que Serviço B só pode começar após Serviço A concluir em cada local.
          </p>
        </div>
        <button onClick={carregar} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-10 space-y-10">
        {/* Criador de dependência */}
        <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Dependência</p>

          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Serviço Predecessor */}
            <div className="flex-1 w-full">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Predecessor (deve terminar primeiro)
              </label>
              <select
                value={predId}
                onChange={e => setPredId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar serviço...</option>
                {services.filter(s => s.id !== sucId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Seta */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <ArrowRight className="w-6 h-6 text-blue-400" />
              <div className="flex flex-col items-center gap-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lag (dias)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={lagDias}
                  onChange={e => setLagDias(Number(e.target.value))}
                  className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-black text-center text-slate-700"
                />
              </div>
            </div>

            {/* Serviço Sucessor */}
            <div className="flex-1 w-full">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Sucessor (começa depois)
              </label>
              <select
                value={sucId}
                onChange={e => setSucId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar serviço...</option>
                {services.filter(s => s.id !== predId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Botão criar */}
            <button
              type="button"
              onClick={criar}
              disabled={isInvalid || salvando}
              className="shrink-0 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 disabled:opacity-40 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {salvando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar
            </button>
          </div>

          {/* Alertas de validação */}
          {wouldCreateCycle && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Esta dependência criaria um ciclo (A→B e B→A).
            </div>
          )}
          {predId === sucId && predId !== '' && (
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Um serviço não pode depender de si mesmo.
            </div>
          )}
          {erro && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
              <AlertCircle className="w-3 h-3 shrink-0" /> {erro}
            </div>
          )}
        </div>

        {/* Lista de dependências */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
            {deps.length} dependência{deps.length !== 1 ? 's' : ''} definida{deps.length !== 1 ? 's' : ''}
          </p>

          {deps.length === 0 ? (
            <div className="text-center py-12 text-slate-300">
              <GitBranch className="w-10 h-10 mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma dependência criada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deps.map(d => (
                <div key={d.id} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all">
                  {/* Predecessor */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.servicoPredecessor.color }} />
                    <span className="text-sm font-black text-slate-700 truncate">{d.servicoPredecessor.name}</span>
                  </div>

                  {/* Seta + lag */}
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                    {d.lagDias > 0 && (
                      <span className="text-[8px] font-black text-blue-500 uppercase">+{d.lagDias}d</span>
                    )}
                  </div>

                  {/* Sucessor */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.servicoSucessor.color }} />
                    <span className="text-sm font-black text-slate-700 truncate">{d.servicoSucessor.name}</span>
                  </div>

                  {/* Lógica textual */}
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 italic truncate">
                      "{d.servicoSucessor.name}" começa {d.lagDias > 0 ? `${d.lagDias} dia(s) após` : 'quando'} "{d.servicoPredecessor.name}" terminar em cada local
                    </p>
                  </div>

                  {/* Remover */}
                  <button
                    onClick={() => remover(d.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="flex items-start gap-3 p-6 bg-blue-50/40 border border-blue-50 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700/60 font-medium leading-relaxed">
            <strong className="text-blue-800">Como funciona:</strong> Ao definir "Reboco depende de Alvenaria",
            o sistema considera que o Reboco em cada local só pode iniciar após a Alvenaria ser concluída
            no mesmo local. A Linha de Balanço exibirá uma <em>linha fantasma</em> mostrando o impacto de atrasos.
          </p>
        </div>
      </div>
    </div>
  )
}
