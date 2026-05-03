'use client'

import { useState, use } from 'react'
import { 
  Layers, TrendingUp, FileCheck, Rocket, 
  Share2, FileText, AlertCircle, Package
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
import DependenciasServico from '@/components/DependenciasServico'
import ExecutiveDashboard from '@/components/ExecutiveDashboard'
import ObraHeader from '@/components/ObraHeader'
import ObraImportModal from '@/components/ObraImportModal'
import { useObraData } from '@/hooks/useObraData'

export default function ObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: obraId } = use(params)
  
  const { 
    obra, atividades, versoes, diarios, dependencias, 
    hasBaseline, loading, error, refresh 
  } = useObraData(obraId)

  const [aba, setAba] = useState('planejamento')
  const [subAba, setSubAba] = useState('gantt')
  
  const [showImport, setShowImport] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDiario, setSelectedDiario] = useState<any>(null)
  const [showRdoForm, setShowRdoForm] = useState(false)

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
        <p className="text-slate-500 font-medium mb-8">Não foi possível carregar os dados desta obra.</p>
        <button onClick={() => refresh()} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100">
           Tentar Novamente
        </button>
      </div>
    </div>
  )

  // Lógica de Jornada (Maturidade)
  const ativsProgramadas = atividades.filter(a => a.scheduled)
  const ativsEmAndamento = ativsProgramadas.filter(a => a.status === 'em_andamento')
  
  const steps = [
    { label: 'Cronograma', done: atividades.length > 0, info: 'Importe o plano mestre.' },
    { label: 'Programação', done: ativsProgramadas.length > 0, info: 'Defina as tarefas da semana.' },
    { label: 'Controle (RDO)', done: diarios.length > 0, info: 'Registre o avanço de campo.' },
    { label: 'Análise', done: diarios.length >= 5, info: 'Veja desvios e projeções.' }
  ]
  const currentStepIdx = steps.findIndex(s => !s.done)
  const progressPercent = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const currentStep = currentStepIdx !== -1 ? steps[currentStepIdx] : { label: 'Setup Concluído', info: 'A inteligência de dados está ativa.' }

  const handleUpdateAtividade = async (id: string, data: any) => {
    await fetch('/api/atividades', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    refresh()
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 space-y-10 pb-32">
      
      <ObraHeader 
        obra={obra} 
        progressPercent={progressPercent} 
        currentStep={currentStep} 
        stepIndex={currentStepIdx} 
      />

      {/* Navegação */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
         <div className="bg-slate-200/40 p-1 rounded-2xl flex gap-1 border border-slate-200/60">
            {[
              { id: 'planejamento', name: 'Planejamento', icon: <Layers className="w-4 h-4" /> },
              { id: 'campo', name: 'Produção', icon: <Package className="w-4 h-4" /> },
              { id: 'gestao', name: 'Medição', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'controladoria', name: 'Controladoria', icon: <FileCheck className="w-4 h-4" /> },
              { id: 'relatorio', name: 'Executivo', icon: <Rocket className="w-4 h-4" /> },
            ].map(t => (
              <button key={t.id} onClick={() => setAba(t.id)} className={`px-6 py-3 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-tight ${aba === t.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.icon} {t.name}
              </button>
            ))}
         </div>
         <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
               <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </button>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10">
               <FileText className="w-3.5 h-3.5" /> PDF Flash
            </button>
         </div>
      </div>

      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
         {aba === 'planejamento' && (
           <div className="space-y-10">
              <div className="flex gap-8 border-b border-slate-100 pb-4">
                 {['gantt', 'fluxo', 'locais', 'dependencias'].map(s => (
                   <button key={s} onClick={() => setSubAba(s)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === s ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>
                     {s === 'gantt' ? 'Cronograma' : s === 'fluxo' ? 'Linha de Balanço' : s === 'locais' ? 'Estrutura' : 'Precedência'}
                   </button>
                 ))}
              </div>

              {atividades.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 border border-slate-100 text-center flex flex-col items-center">
                   <h3 className="text-3xl font-black text-slate-800 mb-4">Sua obra ainda não tem um cronograma</h3>
                   <button onClick={() => setShowImport(true)} className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl">Importar</button>
                </div>
              ) : (
                subAba === 'gantt' ? <CronogramaGantt atividades={atividades} onUpdateAtividade={handleUpdateAtividade} /> :
                subAba === 'locais' ? <GestaoLocais obraId={obraId} onLocaisChange={refresh} /> :
                subAba === 'dependencias' ? <DependenciasServico obraId={obraId} /> :
                <LinhaBalanco atividades={atividades} dependencias={dependencias} />
              )}
           </div>
         )}

         {aba === 'campo' && (
           <div className="space-y-8">
              <div className="flex gap-8 border-b border-slate-100 pb-4">
                 {['programacao', 'kanban', 'lookahead'].map(s => (
                   <button key={s} onClick={() => setSubAba(s)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === s ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>
                     {s === 'programacao' ? 'Programação' : s === 'kanban' ? 'Kanban' : 'Lookahead'}
                   </button>
                 ))}
              </div>
              {subAba === 'programacao' ? <ProgramacaoObras atividades={atividades} versoes={versoes} onUpdate={handleUpdateAtividade} onComplete={() => { setSubAba('kanban'); refresh(); }} /> :
               subAba === 'lookahead' ? <LookaheadTab atividades={atividades} obraId={obraId} onRefresh={refresh} /> :
               <KanbanTarefas atividades={ativsProgramadas} onUpdateTask={handleUpdateAtividade} onStatusChange={async (id, s) => {
                 await fetch('/api/atividades/status', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, status: s}) })
                 refresh()
               }} />}
           </div>
         )}

         {aba === 'controladoria' && <ControladoriaTab obraId={obraId} />}
         {aba === 'relatorio' && <ExecutiveDashboard obraId={obraId} obra={obra} onSalvarBaseline={async () => {
           await fetch(`/api/obras/${obraId}/baseline`, { method: 'POST' })
           refresh()
         }} hasBaseline={hasBaseline} />}

         {aba === 'gestao' && (
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              <div className="xl:col-span-2 space-y-10">
                 {showRdoForm ? <RdoForm obra={obra} obraId={obraId} dataInicial={selectedDate?.toISOString().slice(0, 10)} ativsEmAndamento={ativsEmAndamento} onSalvo={() => { refresh(); setShowRdoForm(false) }} /> :
                  selectedDiario ? <DiarioDetalhes diario={selectedDiario} onClose={() => setSelectedDiario(null)} /> :
                  <><IntelligenceTab atividades={atividades} diarios={diarios} /><div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm"><CurvaSChart obraId={obraId} /></div></>}
              </div>
              <div>
                 <CalendarioRdo diarios={diarios} onSelectDay={(d, date) => { setSelectedDate(date); setSelectedDiario(d); setShowRdoForm(false) }} onNewRdo={(date) => { setSelectedDate(date); setSelectedDiario(null); setShowRdoForm(true) }} />
              </div>
           </div>
         )}
      </main>

      {showImport && <ObraImportModal obraId={obraId} onClose={() => setShowImport(false)} onImported={refresh} />}
    </div>
  )
}
