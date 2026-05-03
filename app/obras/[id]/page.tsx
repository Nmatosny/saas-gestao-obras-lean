'use client'

import { useState, useEffect, use } from 'react'
import { 
  Calendar, Layers, TrendingUp, LayoutGrid, FileCheck, Rocket, 
  MapPin, User, ArrowLeft, ChevronRight, Share2, FileText, 
  Upload, AlertCircle, X, Plus, Package, History, CheckCircle2, Clock
} from 'lucide-react'
import KanbanTarefas, { AtividadeKanban } from '@/components/KanbanTarefas'
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

type Atividade = AtividadeKanban

export default function ObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: obraId } = use(params)
  
  const [obra, setObra] = useState<any>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [versoes, setVersoes] = useState<any[]>([])
  const [diarios, setDiarios] = useState<any[]>([])
  const [dependencias, setDependencias] = useState<any[]>([])
  const [hasBaseline, setHasBaseline] = useState(false)
  const [aba, setAba] = useState('planejamento')
  const [subAba, setSubAba] = useState('gantt')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Estados de UI restaurados
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [importErro, setImportErro] = useState('')
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDiario, setSelectedDiario] = useState<any>(null)
  const [showRdoForm, setShowRdoForm] = useState(false)

  useEffect(() => {
    if (obraId) {
      carregarDados()
    }
  }, [obraId])

  async function carregarDados() {
    setLoading(true)
    setError(false)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      const [obrasRes, ativRes, diariosRes, versoesRes, depsRes] = await Promise.all([
        fetch(`/api/obras/${obraId}`, { signal: controller.signal }),
        fetch(`/api/atividades?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/diarios?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/versoes?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/dependencias?obraId=${obraId}`, { signal: controller.signal })
      ])

      clearTimeout(timeoutId);

      if (obrasRes.ok) setObra(await obrasRes.json())
      if (ativRes.ok) setAtividades(await ativRes.json())
      if (diariosRes.ok) setDiarios(await diariosRes.json())
      if (versoesRes.ok) setVersoes(await versoesRes.json())
      if (depsRes.ok) setDependencias(await depsRes.json())

      // Check if baseline exists
      const baselineRes = await fetch(`/api/obras/${obraId}/baseline`, { signal: controller.signal })
      if (baselineRes.ok) {
        const bd = await baselineRes.json()
        setHasBaseline(bd.hasBaseline === true)
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError(true)
      setLoading(false)
    }
  }

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
        <p className="text-slate-500 font-medium mb-8">Não foi possível carregar os dados desta obra. Verifique sua conexão.</p>
        <button onClick={() => carregarDados()} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100">
           Tentar Novamente
        </button>
      </div>
    </div>
  )

  async function handleUpdateAtividade(id: string, data: Partial<Atividade>) {
    try {
      const res = await fetch('/api/atividades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (res.ok) await carregarDados()
    } catch (error) { console.error(error) }
  }

  async function salvarBaseline() {
    try {
      const res = await fetch(`/api/obras/${obraId}/baseline`, { method: 'POST' })
      if (res.ok) {
        setHasBaseline(true)
        await carregarDados()
      }
    } catch (e) { console.error(e) }
  }

  async function handleMoverStatus(id: string, novoStatus: string) {
    try {
      await fetch('/api/atividades/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: novoStatus }),
      })
      await carregarDados()
    } catch (error) { console.error(error) }
  }

  async function handleImportar() {
    if (!importFile) return
    setImportando(true)
    setImportErro('')
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      fd.append('obraId', obraId)

      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        await carregarDados()
        setShowImport(false)
        setImportFile(null)
      } else {
        setImportErro(data.error || 'Falha na importação')
      }
    } catch (e) {
      setImportErro('Erro de conexão')
    } finally {
      setImportando(false)
    }
  }

  const ativsProgramadas = atividades.filter(a => a.scheduled)
  const ativsComServico = atividades.filter(a => a.serviceId)
  const ativsEmAndamento = ativsProgramadas.filter(a => a.status === 'em_andamento')

  // Passos de Implementação (Nível Prevision)
  const steps = [
    { id: 'cronograma', label: 'Cronograma', done: atividades.length > 0, info: 'Importe o plano mestre.' },
    { id: 'programacao', label: 'Programação', done: ativsProgramadas.length > 0, info: 'Defina as tarefas da semana.' },
    { id: 'controle', label: 'Controle (RDO)', done: diarios.length > 0, info: 'Registre o avanço de campo.' },
    { id: 'analise', label: 'Análise', done: diarios.length >= 5, info: 'Veja desvios e projeções.' }
  ]
  const currentStepIdx = steps.findIndex(s => !s.done)
  const progressPercent = Math.round((steps.filter(s => s.done).length / steps.length) * 100)

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30 space-y-10 pb-32">
      
      {/* Header Premium com Jornada */}
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                 <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                 </button>
                 <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-100">Operação Ativa</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3 italic">{obra.nome}</h1>
              <div className="flex items-center gap-6 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                 <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-300" /> {obra.endereco || 'Localização não definida'}</span>
                 <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-300" /> {obra.engenheiro || 'Engenheiro Responsável'}</span>
              </div>
           </div>

           <div className="lg:w-[450px] bg-slate-50/50 rounded-2xl p-8 border border-slate-100 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maturidade do Planejamento</p>
                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{progressPercent}%</span>
              </div>
              <div className="flex gap-1.5 mb-6">
                 {steps.map((s, i) => (
                   <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${s.done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                 ))}
              </div>
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm">
                    {currentStepIdx !== -1 ? currentStepIdx + 1 : '✓'}
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight mb-0.5">
                       {currentStepIdx !== -1 ? `Próxima Etapa: ${steps[currentStepIdx].label}` : 'Setup de Engenharia Concluído'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
                      {currentStepIdx !== -1 ? steps[currentStepIdx].info : 'A inteligência de dados está 100% ativa para esta obra.'}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>


      {/* Navegação Modular */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
         <div className="bg-slate-200/40 p-1 rounded-2xl flex gap-1 border border-slate-200/60">
            <span className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center border-r border-slate-300/30 mr-1">Módulos</span>
            {[
              { id: 'planejamento', name: 'Planejamento', icon: <Layers className="w-4 h-4" /> },
              { id: 'campo', name: 'Produção', icon: <Package className="w-4 h-4" /> },
              { id: 'gestao', name: 'Medição', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'controladoria', name: 'Controladoria', icon: <FileCheck className="w-4 h-4" /> },
              { id: 'relatorio', name: 'Executivo', icon: <Rocket className="w-4 h-4" /> },
            ].map(t => (
              <button key={t.id} onClick={() => setAba(t.id)} className={`px-6 py-3 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-tight ${aba === t.id ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5' : 'text-slate-500 hover:text-slate-700'}`}>
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


      {/* Conteúdo Dinâmico */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
         
         {/* ABA ENGENHARIA */}
         {aba === 'planejamento' && (
           <div className="space-y-10">
              <div className="flex gap-8 border-b border-slate-100 pb-4 ml-6">
                 <button onClick={() => setSubAba('gantt')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'gantt' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Cronograma Mestre</button>
                 <button onClick={() => setSubAba('fluxo')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'fluxo' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Linha de Balanço (LOB)</button>
                 <button onClick={() => setSubAba('locais')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'locais' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Estrutura (WBS)</button>
                 <button onClick={() => setSubAba('dependencias')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'dependencias' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Rede de Precedência</button>
              </div>


              {atividades.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 border border-slate-100 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                       <Package className="w-10 h-10 text-blue-500" />
                    </div>
                   <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Sua obra ainda não tem um cronograma</h3>
                   <p className="text-slate-400 font-medium max-w-md mx-auto mb-10">O primeiro passo para o sucesso é definir o planejamento. Suba um arquivo Excel ou MS Project para começar.</p>
                   <button onClick={() => setShowImport(true)} className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-lg hover:scale-105 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest">
                      Importar Cronograma
                   </button>
                </div>
              ) : (
                subAba === 'gantt' ? (
                   <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                         <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Cronograma Mestre</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Planejamento de Longo Prazo</p>
                         </div>
                         <button onClick={() => setShowImport(true)} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Novo Upload</button>
                      </div>
                       <CronogramaGantt atividades={atividades} onUpdateAtividade={handleUpdateAtividade} />
                   </div>
                ) : subAba === 'locais' ? (
                   <GestaoLocais obraId={obraId} onLocaisChange={carregarDados} />
                ) : subAba === 'dependencias' ? (
                   <DependenciasServico obraId={obraId} />
                ) : (
                   <LinhaBalanco atividades={atividades} dependencias={dependencias} />
                )
              )}
           </div>
         )}

         {/* ABA CANTEIRO */}
         {aba === 'campo' && (
           <div className="space-y-8">
              <div className="flex gap-8 border-b border-slate-100 pb-4 ml-6">
                 <button onClick={() => setSubAba('programacao')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'programacao' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Plano de Ataque Semanal</button>
                 <button onClick={() => setSubAba('kanban')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'kanban' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Gestão de Postos</button>
                 <button onClick={() => setSubAba('lookahead')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${subAba === 'lookahead' ? 'text-blue-600 border-b-2 border-blue-600 pb-4' : 'text-slate-400'}`}>Remoção de Restrições (Lookahead)</button>
              </div>


              {subAba === 'programacao' ? (
                 <ProgramacaoObras 
                   atividades={atividades} 
                   versoes={versoes} 
                   onUpdate={handleUpdateAtividade} 
                   onComplete={() => { setSubAba('kanban'); carregarDados(); }} 
                 />
              ) : subAba === 'lookahead' ? (
                <LookaheadTab 
                   atividades={atividades} 
                   obraId={obraId} 
                   onRefresh={carregarDados} 
                 />
              ) : (
                ativsProgramadas.length === 0 ? (
                  <div className="bg-white rounded-2xl p-20 border border-slate-100 text-center flex flex-col items-center">
                     <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-8 text-amber-500">
                        <Rocket className="w-10 h-10" />
                     </div>
                     <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Nenhuma tarefa no Kanban</h3>
                     <p className="text-slate-400 font-medium max-w-md mx-auto mb-10">Use a Central de Programação para escolher o que será executado esta semana.</p>
                     <button onClick={() => setSubAba('programacao')} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-lg hover:scale-105 transition-all">
                        Programar Agora
                     </button>
                  </div>
                ) : (
                  <KanbanTarefas 
                    atividades={ativsProgramadas} 
                    onUpdateTask={handleUpdateAtividade}
                    onStatusChange={handleMoverStatus}
                  />
                )
              )}
           </div>
         )}

         {/* ABA CONTROLADORIA */}
         {aba === 'controladoria' && (
           <ControladoriaTab obraId={obraId} />
         )}

         {/* ABA RELATÓRIO EXECUTIVO */}
         {aba === 'relatorio' && (
           <ExecutiveDashboard
             obraId={obraId}
             obra={obra}
             onSalvarBaseline={salvarBaseline}
             hasBaseline={hasBaseline}
           />
         )}

         {/* ABA GESTÃO */}
         {aba === 'gestao' && (
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              <div className="xl:col-span-2 space-y-10">
                 {showRdoForm ? (
                    <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-xl">
                       <div className="flex justify-between items-center mb-8">
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Preencher Diário</h3>
                          <button onClick={() => { setShowRdoForm(false); setSelectedDiario(null) }} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                       </div>
                       <RdoForm 
                         obra={obra} 
                         obraId={obraId} 
                         dataInicial={selectedDate?.toISOString().slice(0, 10)}
                         ativsEmAndamento={ativsEmAndamento} 
                         onSalvo={() => { carregarDados(); setShowRdoForm(false) }} 
                       />
                    </div>
                 ) : selectedDiario ? (
                    <DiarioDetalhes 
                       diario={selectedDiario} 
                       onClose={() => setSelectedDiario(null)} 
                    />
                 ) : (
                    <>
                      <IntelligenceTab atividades={atividades} diarios={diarios} />
                      <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                         <h3 className="text-xl font-black text-slate-800 mb-8">Evolução (Curva S)</h3>
                         <CurvaSChart obraId={obraId} />
                      </div>
                    </>
                 )}
              </div>
              <div className="space-y-10">
                  <CalendarioRdo 
                     diarios={diarios} 
                     onSelectDay={(d, date) => {
                        setSelectedDate(date)
                        setSelectedDiario(d)
                        setShowRdoForm(false) // Fecha o form se estiver visualizando
                     }}
                     onNewRdo={(date) => {
                        setSelectedDate(date)
                        setSelectedDiario(null)
                        setShowRdoForm(true)
                     }}
                  />
                  <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Próximos Marcos</h3>
                    <div className="space-y-4">
                       {atividades.filter(a => a.isCritical).slice(0, 3).map(a => (
                         <div key={a.id} className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm font-black text-xs">
                               {new Date(a.endDate).getDate()}
                            </div>
                            <div>
                               <p className="text-xs font-black text-red-900">{a.name}</p>
                               <p className="text-[10px] font-bold text-red-700/60 uppercase">Impacto no Prazo</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
         )}
      </main>

      {/* Modal Importação */}
      {showImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowImport(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-12 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">Importar Cronograma</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">MS Project (XML) ou Excel (.xlsx)</p>
                </div>
                <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <div className="border-2 border-dashed border-slate-100 rounded-xl p-12 text-center bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all group">
                <input type="file" className="hidden" id="fileInput" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                <label htmlFor="fileInput" className="cursor-pointer">
                   <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-blue-600" />
                   </div>
                   <p className="text-sm font-black text-slate-700">{importFile ? importFile.name : 'Clique para selecionar o arquivo'}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">Arraste e solte o arquivo aqui</p>
                </label>
             </div>
             {importErro && <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold border border-red-100 uppercase">{importErro}</div>}
             <div className="flex gap-4 mt-12">
                <button onClick={() => setShowImport(false)} className="flex-1 py-4 font-black uppercase text-slate-400 tracking-widest text-[10px]">Cancelar</button>
                <button onClick={handleImportar} disabled={!importFile || importando} className="flex-1 bg-blue-600 text-white py-5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 disabled:opacity-50">
                   {importando ? 'Sincronizando Dados...' : 'Iniciar Importação'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
