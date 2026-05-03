'use client'

import { useState, useEffect } from 'react'
import {
  Cloud, Sun, CloudRain, AlertTriangle, Hammer, Users,
  Save, CheckCircle, Plus, X, Package, AlertCircle, Trash2, Camera,
  ChevronDown, ChevronUp
} from 'lucide-react'

import { Obra, Atividade, Diario } from '@/lib/types'

interface Ocorrencia { tipo: string; detalhe: string }
interface Equipamento { nome: string; quantidade: number }
interface Efetivo { funcao: string; count: number }

type Props = {
  obra: Obra
  obraId: string
  dataInicial?: string
  ativsEmAndamento: Atividade[]
  onSalvo: (novoDiario: Diario) => void
}

// Per-activity extra data tracked alongside avancos
type AtivExtra = {
  trabalhadores: number
  fotos: { url: string; caption: string }[]
  expanded: boolean
}

const OPCOES_CLIMA = [
  { value: 'ensolarado', label: 'Ensolarado', icon: <Sun className="w-4 h-4 text-amber-500" /> },
  { value: 'nublado', label: 'Nublado', icon: <Cloud className="w-4 h-4 text-slate-400" /> },
  { value: 'chuvoso', label: 'Chuvoso', icon: <CloudRain className="w-4 h-4 text-blue-500" /> },
  { value: 'chuva_intensa', label: 'Chuva Intensa', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
]

const OPCOES_OCORRENCIA = [
  'Atraso na entrega de material',
  'Falta de energia/água',
  'Equipamento quebrado',
  'Acidente de trabalho',
  'Erro de execução',
  'Outros',
]

export default function RdoForm({ obra, obraId, dataInicial, ativsEmAndamento, onSalvo }: Props) {
  const [data, setData] = useState(() => dataInicial || new Date().toISOString().slice(0, 10))
  const [climaManha, setClimaManha] = useState('ensolarado')
  const [climaTarde, setClimaTarde] = useState('ensolarado')
  const [climaNoite, setClimaNoite] = useState('ensolarado')
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [efetivos, setEfetivos] = useState<Efetivo[]>([])
  const [avancos, setAvancos] = useState<Record<string, number>>({})
  const [atividadeExtra, setAtividadeExtra] = useState<Record<string, AtivExtra>>({})
  const [fotos, setFotos] = useState<{ url: string; caption: string }[]>([])
  const [salvando, setSalvando] = useState(false)

  // Inputs de adição (controlled, evita getElementById)
  const [ocTipo, setOcTipo] = useState('')
  const [ocDetalhe, setOcDetalhe] = useState('')
  const [funcao, setFuncao] = useState('')
  const [funcaoQtd, setFuncaoQtd] = useState('')
  const [eqNome, setEqNome] = useState('')
  const [eqQtd, setEqQtd] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoCap, setFotoCap] = useState('')

  useEffect(() => { if (dataInicial) setData(dataInicial) }, [dataInicial])

  useEffect(() => {
    setAvancos(prev => {
      const next = { ...prev }
      ativsEmAndamento.forEach(a => { if (next[a.id] === undefined) next[a.id] = a.progress })
      return next
    })
    setAtividadeExtra(prev => {
      const next = { ...prev }
      ativsEmAndamento.forEach(a => {
        if (!next[a.id]) next[a.id] = { trabalhadores: 0, fotos: [], expanded: false }
      })
      return next
    })
  }, [ativsEmAndamento])

  function updateExtra(atividadeId: string, patch: Partial<AtivExtra>) {
    setAtividadeExtra(prev => ({ ...prev, [atividadeId]: { ...prev[atividadeId], ...patch } }))
  }

  function addFotoAtividade(atividadeId: string, url: string, caption: string) {
    if (!url) return
    setAtividadeExtra(prev => ({
      ...prev,
      [atividadeId]: {
        ...prev[atividadeId],
        fotos: [...(prev[atividadeId]?.fotos || []), { url, caption }]
      }
    }))
  }

  function removeFotoAtividade(atividadeId: string, idx: number) {
    setAtividadeExtra(prev => ({
      ...prev,
      [atividadeId]: {
        ...prev[atividadeId],
        fotos: prev[atividadeId].fotos.filter((_, i) => i !== idx)
      }
    }))
  }

  const climaImprodutivo = climaManha === 'chuva_intensa' || climaTarde === 'chuva_intensa' ||
    (climaManha === 'chuvoso' && climaTarde === 'chuvoso')

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = {
        obraId,
        date: data,
        weatherMorning: climaManha,
        weatherAfternoon: climaTarde,
        weatherNight: climaNoite,
        ocorrencias: JSON.stringify(ocorrencias),
        equipamentos: JSON.stringify(equipamentos),
        efetivos: efetivos.map(ef => ({ role: ef.funcao, count: ef.count })),
        atividades: Object.entries(avancos).map(([id, p]) => ({
          atividadeId: id,
          progress: p,
          status: p >= 100 ? 'concluido' : 'em_andamento',
          quantidadeTrabalhadores: atividadeExtra[id]?.trabalhadores || 0,
          fotosAtividade: atividadeExtra[id]?.fotos || []
        })),
        fotos: fotos.map(f => ({ url: f.url, caption: f.caption }))
      }
      const res = await fetch('/api/diarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onSalvo(await res.json())
        setEfetivos([]); setOcorrencias([]); setEquipamentos([])
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6 pb-20">

      {/* Cabeçalho */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-start justify-between border-b border-slate-50 pb-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registro de Campo</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Diário de Obra (RDO)</h2>
          </div>
          <input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" value={data} onChange={e => setData(e.target.value)} />
        </div>

        {/* Clima */}
        <div className="grid grid-cols-3 gap-6">
          {(['Manhã', 'Tarde', 'Noite'] as const).map(p => {
            const val = p === 'Manhã' ? climaManha : p === 'Tarde' ? climaTarde : climaNoite
            const setter = p === 'Manhã' ? setClimaManha : p === 'Tarde' ? setClimaTarde : setClimaNoite
            return (
              <div key={p} className="space-y-2 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{p}</label>
                <div className="flex gap-1.5 justify-center">
                  {OPCOES_CLIMA.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setter(opt.value)}
                      className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all ${val === opt.value ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Alerta dia improdutivo */}
        {climaImprodutivo && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs font-bold text-blue-700">
              <strong>Dia Improdutivo detectado.</strong> Este dia será marcado automaticamente como impacto climático na Controladoria.
            </p>
          </div>
        )}
      </div>

      {/* Avanço Físico Pro */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Hammer className="w-4 h-4 text-blue-600" /> Produção Diária
           </h3>
           <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-600">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase">{ativsEmAndamento.length} Sugeridas</span>
           </div>
        </div>

        <div className="space-y-3">

          {ativsEmAndamento.map(a => {
            const val = avancos[a.id] ?? a.progress
            const desvio = val - (a.plannedProgress || 0)
            const extra = atividadeExtra[a.id] || { trabalhadores: 0, fotos: [], expanded: false }

            return (
              <div key={a.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                {/* Row principal */}
                <div className="bg-slate-50/50 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.service?.color || '#cbd5e1' }} />
                        <p className="text-sm font-black text-slate-800 leading-none truncate">{a.name}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-4">{a.location?.name}</p>
                    </div>

                    {/* Trabalhadores */}
                    <div className="flex flex-col items-center gap-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trabalhadores</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateExtra(a.id, { trabalhadores: Math.max(0, extra.trabalhadores - 1) })}
                          className="w-7 h-7 bg-white border border-slate-200 rounded-lg text-slate-500 font-black flex items-center justify-center hover:bg-slate-50">−</button>
                        <span className="w-10 text-center text-sm font-black text-slate-700">{extra.trabalhadores}</span>
                        <button type="button" onClick={() => updateExtra(a.id, { trabalhadores: extra.trabalhadores + 1 })}
                          className="w-7 h-7 bg-blue-600 rounded-lg text-white font-black flex items-center justify-center hover:bg-blue-700">+</button>
                      </div>
                    </div>

                    {/* Progresso */}
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Meta: {a.plannedProgress || 0}%</p>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} max={100}
                          className={`w-16 bg-white border rounded-xl px-3 py-2 text-sm font-black text-center ${desvio < 0 ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-800'}`}
                          value={val}
                          onChange={e => setAvancos({ ...avancos, [a.id]: Number(e.target.value) })} />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>

                    {/* Expandir fotos */}
                    <button type="button" onClick={() => updateExtra(a.id, { expanded: !extra.expanded })}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors shrink-0">
                      {extra.expanded ? <ChevronUp className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Barra de progresso inline */}
                  <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${desvio >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${val}%` }} />
                  </div>
                </div>

                {/* Painel de fotos expandível */}
                {extra.expanded && (
                  <div className="p-5 bg-white border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Camera className="w-3 h-3 text-pink-500" /> Evidências Fotográficas
                    </p>

                    {/* Input adicionar foto */}
                    <FotoInlineInput onAdd={(url, cap) => addFotoAtividade(a.id, url, cap)} />

                    {/* Grid de fotos anexadas */}
                    {extra.fotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {extra.fotos.map((f, i) => (
                          <div key={i} className="relative group aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <img src={f.url} alt={f.caption} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                              <p className="text-white text-[9px] font-bold truncate">{f.caption || 'Sem legenda'}</p>
                              <button type="button" onClick={() => removeFotoAtividade(a.id, i)}
                                className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full hover:bg-red-500 text-white transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {ativsEmAndamento.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm font-bold">Nenhuma atividade em andamento</div>
          )}
        </div>
      </div>

      {/* Ocorrências */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" /> Ocorrências
        </h3>
        <div className="flex gap-4 mb-4">
          <select className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700" value={ocTipo} onChange={e => setOcTipo(e.target.value)}>
            <option value="">Tipo...</option>
            {OPCOES_OCORRENCIA.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input placeholder="Detalhe" className="flex-[2] bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold"
            value={ocDetalhe} onChange={e => setOcDetalhe(e.target.value)} />
          <button type="button" className="bg-amber-500 text-white p-2.5 rounded-xl shadow-lg" onClick={() => {
            if (ocTipo) { setOcorrencias([...ocorrencias, { tipo: ocTipo, detalhe: ocDetalhe }]); setOcTipo(''); setOcDetalhe('') }
          }}><Plus className="w-5 h-5" /></button>
        </div>
        <div className="space-y-2">
          {ocorrencias.map((oc, i) => (
            <div key={i} className="bg-amber-50 px-4 py-3 rounded-2xl text-xs font-bold text-amber-700 flex items-center justify-between">
              <span><span className="font-black uppercase mr-2">[{oc.tipo}]</span> {oc.detalhe}</span>
              <button type="button" onClick={() => setOcorrencias(ocorrencias.filter((_, j) => i !== j))}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Mão de Obra + Equipamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Mão de Obra Geral
          </h3>
          <div className="flex gap-2 mb-4">
            <input placeholder="Função" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold"
              value={funcao} onChange={e => setFuncao(e.target.value)} />
            <input type="number" placeholder="Qtd" className="w-16 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold"
              value={funcaoQtd} onChange={e => setFuncaoQtd(e.target.value)} />
            <button type="button" className="bg-slate-900 text-white p-2.5 rounded-xl" onClick={() => {
              if (funcao && funcaoQtd) { setEfetivos([...efetivos, { funcao, count: Number(funcaoQtd) }]); setFuncao(''); setFuncaoQtd('') }
            }}><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {efetivos.map((ef, i) => (
              <div key={i} className="bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-600 flex items-center gap-2">
                {ef.count}× {ef.funcao}
                <button type="button" onClick={() => setEfetivos(efetivos.filter((_, j) => i !== j))}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" /> Equipamentos
          </h3>
          <div className="flex gap-2 mb-4">
            <input placeholder="Equipamento" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold"
              value={eqNome} onChange={e => setEqNome(e.target.value)} />
            <input type="number" placeholder="Qtd" className="w-16 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold"
              value={eqQtd} onChange={e => setEqQtd(e.target.value)} />
            <button type="button" className="bg-slate-900 text-white p-2.5 rounded-xl" onClick={() => {
              if (eqNome && eqQtd) { setEquipamentos([...equipamentos, { nome: eqNome, quantidade: Number(eqQtd) }]); setEqNome(''); setEqQtd('') }
            }}><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {equipamentos.map((eq, i) => (
              <div key={i} className="bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-600 flex items-center gap-2">
                {eq.quantidade}× {eq.nome}
                <button type="button" onClick={() => setEquipamentos(equipamentos.filter((_, j) => i !== j))}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Galeria Geral de Evidências */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-500" /> Galeria Geral de Evidências
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase">{fotos.length} fotos</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border-2 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all">
            <input placeholder="URL da Imagem" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold mb-3"
              value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} />
            <input placeholder="Legenda" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold mb-4"
              value={fotoCap} onChange={e => setFotoCap(e.target.value)} />
            <button type="button" className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              onClick={() => { if (fotoUrl) { setFotos([...fotos, { url: fotoUrl, caption: fotoCap }]); setFotoUrl(''); setFotoCap('') } }}>
              <Plus className="w-4 h-4" /> Adicionar Foto
            </button>
          </div>
          {fotos.map((f, i) => (
            <div key={i} className="relative group aspect-video bg-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <img src={f.url} alt={f.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <p className="text-white text-[10px] font-bold truncate">{f.caption || 'Sem legenda'}</p>
                <button type="button" onClick={() => setFotos(fotos.filter((_, j) => i !== j))}
                  className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-red-500 text-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
        {salvando
          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <Save className="w-5 h-5" />}
        Finalizar e Publicar RDO
      </button>
    </form>
  )
}

// ─── Sub-componente: input inline de foto ─────────────────────────────────────

function FotoInlineInput({ onAdd }: { onAdd: (url: string, caption: string) => void }) {
  const [url, setUrl] = useState('')
  const [cap, setCap] = useState('')
  return (
    <div className="flex gap-2">
      <input
        placeholder="URL da foto..."
        className="flex-[2] bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <input
        placeholder="Legenda"
        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold"
        value={cap}
        onChange={e => setCap(e.target.value)}
      />
      <button
        type="button"
        onClick={() => { if (url) { onAdd(url, cap); setUrl(''); setCap('') } }}
        className="bg-pink-500 text-white px-3 py-2 rounded-xl text-xs font-black hover:bg-pink-600 transition-colors"
      >
        <Camera className="w-4 h-4" />
      </button>
    </div>
  )
}
