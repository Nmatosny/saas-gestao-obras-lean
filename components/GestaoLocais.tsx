'use client'

import { useState, useEffect } from 'react'
import {
  MapPin, Plus, Trash2, GripVertical, Layers, Zap,
  ChevronDown, ChevronUp, AlertCircle, Check, X, Hash
} from 'lucide-react'

type Location = {
  id: string
  name: string
  order: number
  obraId: string
  _count?: { atividades: number }
}

type Service = {
  id: string
  name: string
  color: string
  custoEstimado?: number
}

type Props = {
  obraId: string
  onLocaisChange?: () => void
}

const CORES_SERVICO = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
]

export default function GestaoLocais({ obraId, onLocaisChange }: Props) {
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'locais' | 'servicos' | 'fluxo'>('locais')

  // Formulário - local único
  const [novoNome, setNovoNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Formulário - range de locais
  const [showRange, setShowRange] = useState(false)
  const [rangePrefixo, setRangePrefixo] = useState('Pavimento')
  const [rangeDe, setRangeDe] = useState(1)
  const [rangeAte, setRangeAte] = useState(10)
  const [rangeCustom, setRangeCustom] = useState(false)
  const [rangeCustomNome, setRangeCustomNome] = useState('{n}º Pavimento')

  // Formulário - serviço
  const [novoServico, setNovoServico] = useState('')
  const [novaCorServico, setNovaCorServico] = useState(CORES_SERVICO[0])
  const [novoCustoServico, setNovoCustoServico] = useState('')
  const [salvandoServico, setSalvandoServico] = useState(false)
  const [editandoCustoId, setEditandoCustoId] = useState<string | null>(null)
  const [editandoCustoVal, setEditandoCustoVal] = useState('')

  // Formulário - fluxo de serviço
  const [fluxoServiceId, setFluxoServiceId] = useState('')
  const [fluxoLocIds, setFluxoLocIds] = useState<Set<string>>(new Set())
  const [fluxoDuracao, setFluxoDuracao] = useState(5)
  const [fluxoDataInicio, setFluxoDataInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [fluxoCriando, setFluxoCriando] = useState(false)
  const [fluxoSucesso, setFluxoSucesso] = useState(false)

  useEffect(() => { carregar() }, [obraId])

  async function carregar() {
    setLoading(true)
    const [locRes, svcRes] = await Promise.all([
      fetch(`/api/locations?obraId=${obraId}`),
      fetch(`/api/services?obraId=${obraId}`)
    ])
    if (locRes.ok) setLocations(await locRes.json())
    if (svcRes.ok) setServices(await svcRes.json())
    setLoading(false)
  }

  async function criarLocal(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSalvando(true); setErro('')
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: novoNome.trim(), obraId })
    })
    if (res.ok) {
      setNovoNome('')
      await carregar()
      onLocaisChange?.()
    } else {
      const d = await res.json()
      setErro(d.error || 'Erro ao criar local')
    }
    setSalvando(false)
  }

  async function criarRange(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro('')
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId,
        prefixo: rangePrefixo,
        de: rangeDe,
        ate: rangeAte,
        padraoNome: rangeCustom ? rangeCustomNome : undefined
      })
    })
    if (res.ok) {
      setShowRange(false)
      await carregar()
      onLocaisChange?.()
    } else {
      const d = await res.json()
      setErro(d.error || 'Erro ao criar locais')
    }
    setSalvando(false)
  }

  async function deletarLocal(id: string) {
    const res = await fetch(`/api/locations?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      await carregar()
      onLocaisChange?.()
    } else {
      const d = await res.json()
      setErro(d.error)
      setTimeout(() => setErro(''), 4000)
    }
  }

  async function moverLocal(id: string, direcao: 'up' | 'down') {
    const idx = locations.findIndex(l => l.id === id)
    if (direcao === 'up' && idx === 0) return
    if (direcao === 'down' && idx === locations.length - 1) return

    const outro = direcao === 'up' ? locations[idx - 1] : locations[idx + 1]
    await fetch('/api/locations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { id, order: outro.order },
          { id: outro.id, order: locations[idx].order }
        ]
      })
    })
    await carregar()
    onLocaisChange?.()
  }

  async function criarServico(e: React.FormEvent) {
    e.preventDefault()
    if (!novoServico.trim()) return
    setSalvandoServico(true)
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: novoServico.trim(), color: novaCorServico, obraId, custoEstimado: Number(novoCustoServico) || 0 })
    })
    if (res.ok) {
      setNovoServico('')
      setNovoCustoServico('')
      await carregar()
    }
    setSalvandoServico(false)
  }

  async function salvarCustoServico(id: string) {
    await fetch('/api/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, custoEstimado: Number(editandoCustoVal) || 0 })
    })
    setEditandoCustoId(null)
    await carregar()
  }

  async function deletarServico(id: string) {
    const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setErro(d.error)
      setTimeout(() => setErro(''), 4000)
    } else {
      await carregar()
    }
  }

  async function criarFluxo(e: React.FormEvent) {
    e.preventDefault()
    if (!fluxoServiceId || fluxoLocIds.size === 0) return
    setFluxoCriando(true)
    const locsOrdenados = locations
      .filter(l => fluxoLocIds.has(l.id))
      .sort((a, b) => a.order - b.order)
      .map(l => l.id)

    const res = await fetch('/api/atividades/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId,
        serviceId: fluxoServiceId,
        locationIds: locsOrdenados,
        duracaoEmDias: fluxoDuracao,
        dataInicio: fluxoDataInicio
      })
    })
    if (res.ok) {
      setFluxoSucesso(true)
      setFluxoLocIds(new Set())
      onLocaisChange?.()
      setTimeout(() => setFluxoSucesso(false), 3000)
    } else {
      const d = await res.json()
      setErro(d.error)
      setTimeout(() => setErro(''), 4000)
    }
    setFluxoCriando(false)
  }

  const toggleFluxoLoc = (id: string) => {
    const next = new Set(fluxoLocIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFluxoLocIds(next)
  }

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Erro global */}
      {erro && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold">{erro}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-100/60 p-1.5 rounded-2xl flex gap-1 w-fit">
        {([
          { id: 'locais', label: 'Locais', icon: MapPin },
          { id: 'servicos', label: 'Serviços', icon: Layers },
          { id: 'fluxo', label: 'Criar Fluxo', icon: Zap },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setAbaAtiva(t.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              abaAtiva === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── ABA LOCAIS ─── */}
      {abaAtiva === 'locais' && (
        <div className="space-y-6">
          {/* Form local único */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" /> Hierarquia de Locais
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {locations.length} local(is) cadastrado(s). Ordene arrastando.
                </p>
              </div>
              <button
                onClick={() => setShowRange(!showRange)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  showRange ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Hash className="w-3.5 h-3.5" /> Gerar por Range
              </button>
            </div>

            {/* Form single */}
            <form onSubmit={criarLocal} className="flex gap-3">
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Ex: Térreo, 1º Pavimento, Cobertura..."
                className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={salvando || !novoNome.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>

            {/* Form range */}
            {showRange && (
              <form onSubmit={criarRange} className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Geração em Série</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Prefixo</label>
                    <input
                      value={rangePrefixo}
                      onChange={e => setRangePrefixo(e.target.value)}
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border border-slate-200"
                      placeholder="Pavimento"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">De</label>
                    <input
                      type="number" min={1}
                      value={rangeDe}
                      onChange={e => setRangeDe(Number(e.target.value))}
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Até</label>
                    <input
                      type="number" min={rangeDe}
                      value={rangeAte}
                      onChange={e => setRangeAte(Number(e.target.value))}
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRangeCustom(!rangeCustom)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${rangeCustom ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                  >
                    {rangeCustom && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs font-bold text-slate-500">Padrão de nome customizado</span>
                </div>
                {rangeCustom && (
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Padrão (use {'{n}'} para o número)</label>
                    <input
                      value={rangeCustomNome}
                      onChange={e => setRangeCustomNome(e.target.value)}
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border border-slate-200"
                      placeholder="{n}º Pavimento"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Prévia: {rangeCustomNome.replace('{n}', String(rangeDe))}, {rangeCustomNome.replace('{n}', String(rangeDe + 1))}...</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowRange(false)} className="px-4 py-2 text-xs font-bold text-slate-400">Cancelar</button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" /> Gerar {rangeAte - rangeDe + 1} locais
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Lista de locais */}
          {locations.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 p-16 text-center">
              <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum local cadastrado</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Adicione locais para estruturar sua obra</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
              {locations.map((loc, idx) => (
                <div key={loc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moverLocal(loc.id, 'up')} disabled={idx === 0} className="p-0.5 text-slate-200 hover:text-slate-600 disabled:opacity-20">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moverLocal(loc.id, 'down')} disabled={idx === locations.length - 1} className="p-0.5 text-slate-200 hover:text-slate-600 disabled:opacity-20">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <GripVertical className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[10px] font-black text-blue-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">{loc.name}</p>
                    {loc._count && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        {loc._count.atividades} atividade(s)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deletarLocal(loc.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA SERVIÇOS ─── */}
      {abaAtiva === 'servicos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Tipos de Serviço
            </h3>
            <form onSubmit={criarServico} className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Nome do serviço</label>
                <input
                  value={novoServico}
                  onChange={e => setNovoServico(e.target.value)}
                  placeholder="Ex: Alvenaria, Reboco..."
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-36">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Orçamento (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={novoCustoServico}
                  onChange={e => setNovoCustoServico(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cor</label>
                <div className="flex gap-1.5 flex-wrap w-48">
                  {CORES_SERVICO.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setNovaCorServico(c)}
                      className={`w-7 h-7 rounded-lg transition-all border-2 ${novaCorServico === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={salvandoServico || !novoServico.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </form>
          </div>

          {services.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 p-16 text-center">
              <Layers className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum serviço cadastrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
              {services.map(svc => (
                <div key={svc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 group transition-colors">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />
                  <p className="flex-1 text-sm font-black text-slate-800">{svc.name}</p>

                  {/* Custo estimado inline edit */}
                  {editandoCustoId === svc.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400">R$</span>
                      <input
                        type="number"
                        autoFocus
                        value={editandoCustoVal}
                        onChange={e => setEditandoCustoVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') salvarCustoServico(svc.id); if (e.key === 'Escape') setEditandoCustoId(null) }}
                        className="w-28 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-black text-blue-700 text-right"
                      />
                      <button onClick={() => salvarCustoServico(svc.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditandoCustoId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditandoCustoId(svc.id); setEditandoCustoVal(String(svc.custoEstimado || 0)) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group/cost"
                    >
                      <Hash className="w-3 h-3 text-slate-300 group-hover/cost:text-blue-400" />
                      <span className="text-[10px] font-black text-slate-500 group-hover/cost:text-blue-600">
                        {(svc.custoEstimado || 0) > 0
                          ? `R$ ${(svc.custoEstimado!).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                          : 'Orçamento'
                        }
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => deletarServico(svc.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA FLUXO ─── */}
      {abaAtiva === 'fluxo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <div className="mb-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Motor de Sequenciamento
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Escolha um serviço, selecione os locais na ordem de execução e defina a duração. O sistema cria as atividades encadeadas automaticamente.
              </p>
            </div>

            {services.length === 0 || locations.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs font-bold text-amber-700">
                  Você precisa ter ao menos 1 serviço e 1 local cadastrados antes de criar um fluxo.
                </p>
              </div>
            ) : (
              <form onSubmit={criarFluxo} className="space-y-8">
                {/* Serviço */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">1. Selecione o Serviço</label>
                  <div className="flex flex-wrap gap-2">
                    {services.map(s => (
                      <button
                        key={s.id} type="button"
                        onClick={() => setFluxoServiceId(s.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${
                          fluxoServiceId === s.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data e Duração */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">2. Data de Início (1º Local)</label>
                    <input
                      type="date"
                      value={fluxoDataInicio}
                      onChange={e => setFluxoDataInicio(e.target.value)}
                      className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                      3. Duração por Local <span className="text-blue-600">({fluxoDuracao} dias)</span>
                    </label>
                    <input
                      type="range" min={1} max={60}
                      value={fluxoDuracao}
                      onChange={e => setFluxoDuracao(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-300 mt-1">
                      <span>1d</span><span>30d</span><span>60d</span>
                    </div>
                  </div>
                </div>

                {/* Locais */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      4. Locais de Execução ({fluxoLocIds.size} selecionados)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFluxoLocIds(fluxoLocIds.size === locations.length ? new Set() : new Set(locations.map(l => l.id)))}
                      className="text-[9px] font-black text-blue-600 hover:underline uppercase"
                    >
                      {fluxoLocIds.size === locations.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                    {locations.map((loc, idx) => (
                      <button
                        key={loc.id} type="button"
                        onClick={() => toggleFluxoLoc(loc.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2 text-left ${
                          fluxoLocIds.has(loc.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${fluxoLocIds.has(loc.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                          {fluxoLocIds.has(loc.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate">{loc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview do sequenciamento */}
                {fluxoServiceId && fluxoLocIds.size > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Prévia do Sequenciamento</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {locations
                        .filter(l => fluxoLocIds.has(l.id))
                        .sort((a, b) => a.order - b.order)
                        .map((loc, idx) => {
                          const svc = services.find(s => s.id === fluxoServiceId)
                          const inicio = new Date(fluxoDataInicio)
                          inicio.setDate(inicio.getDate() + idx * fluxoDuracao)
                          const fim = new Date(inicio)
                          fim.setDate(fim.getDate() + fluxoDuracao - 1)
                          return (
                            <div key={loc.id} className="flex items-center gap-3 text-xs">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span>
                              <span className="font-bold text-slate-700 flex-1 truncate">{svc?.name} — {loc.name}</span>
                              <span className="text-slate-400 font-medium shrink-0">
                                {inicio.toLocaleDateString('pt-BR')} → {fim.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fluxoCriando || !fluxoServiceId || fluxoLocIds.size === 0}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 hover:bg-blue-600 transition-colors"
                >
                  {fluxoCriando ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : fluxoSucesso ? (
                    <><Check className="w-5 h-5" /> Fluxo Criado!</>
                  ) : (
                    <><Zap className="w-5 h-5" /> Criar Fluxo de Serviço</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
