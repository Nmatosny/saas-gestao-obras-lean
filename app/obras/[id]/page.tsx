'use client'

import { useState, use, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Layers, TrendingUp, FileCheck, Rocket,
  Share2, FileText, AlertCircle, Package,
  LayoutDashboard, Check, Calendar
} from 'lucide-react'
import KanbanTarefas from '@/components/KanbanTarefas'
import CronogramaGantt from '@/components/CronogramaGantt'
import ProgramacaoObras from '@/components/ProgramacaoObras'
import CurvaSChart from '@/components/CurvaSChart'
import CalendarioRdo from '@/components/CalendarioRdo'
import RdoForm from '@/components/RdoForm'
import IntelligenceTab from '@/components/IntelligenceTab'
import LinhaBalanco from '@/components/LinhaBalanco'
import LookaheadTab from '@/components/LookaheadTab'
import DiarioDetalhes from '@/components/DiarioDetalhes'
import GestaoLocais from '@/components/GestaoLocais'
import ControladoriaTab from '@/components/ControladoriaTab'
import ExecutiveDashboard from '@/components/ExecutiveDashboard'
import ObraHeader from '@/components/ObraHeader'
import ObraImportModal from '@/components/ObraImportModal'
import OverviewTab from '@/components/OverviewTab'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useObraData } from '@/hooks/useObraData'
import { Diario, Atividade } from '@/lib/types'

export default function ObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: obraId } = use(params)

  const {
    obra, atividades, versoes, diarios, dependencias, alerts, stats,
    hasBaseline, loading, error, refresh, mutateState
  } = useObraData(obraId)

  const searchParams = useSearchParams()
  const router = useRouter()
  const aba = searchParams.get('aba') || 'overview'
  const view = searchParams.get('view') || ''

  const subAba = useMemo(() => {
    if (aba === 'planejamento') return view || 'locais'
    if (aba === 'campo') return view || 'kanban'
    return view
  }, [aba, view])

  const ativsProgramadas = useMemo(() => atividades.filter(a => a.status && a.status !== 'planejado'), [atividades])

  const [showImport, setShowImport] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDiario, setSelectedDiario] = useState<Diario | null>(null)
  const [showRdoForm, setShowRdoForm] = useState(false)
  const [showWizard, setShowWizard] = useState(true)
  const [shareFeedback, setShareFeedback] = useState(false)

  // Compartilhar: copia URL real e mostra feedback visual
  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setShareFeedback(true)
    setTimeout(() => setShareFeedback(false), 2500)
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleUpdateAtividade = useCallback(async (id: string, data: Partial<Atividade>) => {
    // Optimistic Update
    mutateState(prev => ({
      ...prev,
      atividades: prev.atividades.map(a => a.id === id ? { ...a, ...data } : a)
    }))
    
    await fetch('/api/atividades', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    // Opcionalmente, atualizar com dados do server em background
    refresh()
  }, [mutateState, refresh])

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    // Optimistic Update
    mutateState(prev => ({
      ...prev,
      atividades: prev.atividades.map(a => a.id === id ? { ...a, status } : a)
    }))

    await fetch('/api/atividades/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    refresh()
  }, [mutateState, refresh])

  const handleSalvarBaseline = useCallback(async () => {
    await fetch(`/api/obras/${obraId}/baseline`, { method: 'POST' })
    refresh()
  }, [obraId, refresh])

  const handleSetAba = useCallback((novaAba: string, novaSubAba?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('aba', novaAba)
    if (novaSubAba) params.set('view', novaSubAba)
    else params.delete('view')
    router.push(`/obras/${obraId}?${params.toString()}`)
  }, [searchParams, router, obraId])

  const handleSetView = useCallback((novoView: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', novoView)
    router.push(`/obras/${obraId}?${params.toString()}`)
  }, [searchParams, router, obraId])

  const handleImported = useCallback(() => {
    refresh()
    handleSetAba('planejamento', 'locais')
  }, [refresh, handleSetAba])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando Canteiro...</p>
      </div>
    </div>
  )

  if (error || !obra) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Erro de Sincronização</h3>
        <p className="text-slate-500 font-medium mb-8">Não foi possível carregar os dados desta obra. Verifique sua conexão e tente novamente.</p>
        <button
          onClick={() => refresh()}
          className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  )


  const ativsEmAndamento = atividades.filter(
    a => a.status === 'em_andamento' || a.status === 'programado'
  )

  const steps = [
    { label: '1. Cronograma', done: atividades.length > 0, info: 'Importe o plano mestre (XML/Excel).' },
    { label: '2. Estrutura', done: atividades.some(a => a.locationId), info: 'Valide locais e dependências.' },
    { label: '3. Execução', done: ativsProgramadas.length > 0, info: 'Inicie a programação semanal.' },
    { label: '4. Controle', done: diarios.length > 0, info: 'Registre os avanços diários.' },
  ]

  const currentStepIdx = steps.findIndex(s => !s.done)
  const progressPercent = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const currentStep = currentStepIdx !== -1
    ? steps[currentStepIdx]
    : { label: 'Setup Concluído', info: 'A inteligência de dados está ativa.' }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 space-y-10 pb-32">

      <ObraHeader
        obra={obra}
        stats={stats}
        critCount={alerts.filter(a => a.severity === 'critico').length}
      />

      {/* Main Container - Espaçamento simplificado após remover as abas superiores */}
      <div className="pt-2" />

      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">

        {aba === 'overview' && (
          <OverviewTab
            atividades={atividades}
            diarios={diarios}
            obra={obra}
            onSetAba={handleSetAba}
          />
        )}

        {aba === 'planejamento' && (
          <div className="space-y-8">
            <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1 border border-slate-200 overflow-x-auto w-max shadow-inner no-print mx-auto">
              {[
                { id: 'locais',      label: '1. Locais de Trabalho' },
                { id: 'dependencias',label: '2. Precedências' },
                { id: 'gantt',       label: '3. Cronograma (Gantt)' },
                { id: 'fluxo',       label: '4. Linha de Balanço' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSetView(s.id)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider shrink-0 ${
                    subAba === s.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {atividades.length === 0 ? (
              <div className="bg-white rounded-2xl p-20 border border-slate-100 text-center flex flex-col items-center">
                <h3 className="text-3xl font-black text-slate-800 mb-4">Sua obra ainda não tem um cronograma</h3>
                <button
                  onClick={() => setShowImport(true)}
                  className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl"
                >
                  Importar
                </button>
              </div>
            ) : (
              subAba === 'gantt'        ? <CronogramaGantt atividades={atividades} onUpdateAtividade={handleUpdateAtividade} /> :
              subAba === 'locais'       ? <GestaoLocais obraId={obraId} onLocaisChange={refresh} /> :
              subAba === 'dependencias' ? <IntelligenceTab atividades={atividades} diarios={diarios} /> :
              <LinhaBalanco atividades={atividades} dependencias={dependencias} />
            )}
          </div>
        )}

        {aba === 'programacao' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProgramacaoObras
              atividades={atividades}
              versoes={versoes}
              onUpdate={handleUpdateAtividade}
              onComplete={() => { handleSetAba('campo', 'kanban'); refresh() }}
            />
          </div>
        )}

        {aba === 'campo' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1 border border-slate-200 overflow-x-auto w-max shadow-inner no-print mb-4">
              {[
                { id: 'kanban',      label: 'Painel de Produção' },
                { id: 'lookahead',   label: 'Lookahead 4 Semanas' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSetView(s.id)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-wider shrink-0 ${
                    subAba === s.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {subAba === 'lookahead' ? (
              <LookaheadTab atividades={atividades} obraId={obraId} onRefresh={refresh} />
            ) : (
              <KanbanTarefas
                atividades={ativsProgramadas}
                onUpdateTask={handleUpdateAtividade}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>
        )}

        {aba === 'gestao' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 space-y-10">
              {showRdoForm ? (
                <RdoForm
                  obra={obra}
                  obraId={obraId}
                  dataInicial={selectedDate?.toISOString().slice(0, 10)}
                  ativsEmAndamento={ativsEmAndamento}
                  onSalvo={() => { refresh(); setShowRdoForm(false) }}
                />
              ) : selectedDiario ? (
                <DiarioDetalhes diario={selectedDiario} onClose={() => setSelectedDiario(null)} />
              ) : (
                <>
                  <IntelligenceTab atividades={atividades} diarios={diarios} />
                  <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                    <CurvaSChart obraId={obraId} />
                  </div>
                </>
              )}
            </div>
            <div className="no-print">
              <CalendarioRdo
                diarios={diarios}
                onSelectDay={(d, date) => {
                  setSelectedDate(date)
                  setSelectedDiario(d)
                  setShowRdoForm(false)
                }}
                onNewRdo={(date) => {
                  setSelectedDate(date)
                  setSelectedDiario(null)
                  setShowRdoForm(true)
                }}
              />
            </div>
          </div>
        )}

        {aba === 'controladoria' && <ControladoriaTab obraId={obraId} />}

        {aba === 'relatorio' && (
          <ExecutiveDashboard
            obraId={obraId}
            obra={obra}
            onSalvarBaseline={handleSalvarBaseline}
            hasBaseline={hasBaseline}
          />
        )}

      </main>

      {showWizard && atividades.length === 0 && !loading && (
        <OnboardingWizard onClose={() => setShowWizard(false)} />
      )}

      {showImport && (
        <ObraImportModal
          obraId={obraId}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}
