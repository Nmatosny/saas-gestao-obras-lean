'use client'

import Image from 'next/image'
import {
  Users, Hammer, AlertCircle,
  Camera, ChevronLeft, Calendar as CalendarIcon,
  Sun, Cloud, CloudRain, AlertTriangle
} from 'lucide-react'

type DiarioData = {
  date: string
  weatherMorning?: string
  weatherAfternoon?: string
  weatherNight?: string
  efetivos?: { role: string; count: number }[]
  atividades?: { id: string; progress: number; atividade?: { name: string; location?: { name: string } } }[]
  fotos?: { id: string; url: string; caption: string }[]
  notes?: string
  ocorrencias?: string
  equipamentos?: string
}

type Props = {
  diario: DiarioData
  onClose: () => void
}

const CLIMA_MAP: Record<string, { label: string; icon: JSX.Element }> = {
  ensolarado: { label: 'Ensolarado', icon: <Sun className="w-4 h-4 text-amber-500" /> },
  nublado: { label: 'Nublado', icon: <Cloud className="w-4 h-4 text-slate-400" /> },
  chuvoso: { label: 'Chuvoso', icon: <CloudRain className="w-4 h-4 text-blue-500" /> },
  chuva_intensa: { label: 'Chuva Intensa', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
}

export default function DiarioDetalhes({ diario, onClose }: Props) {
  const ocorrencias = diario.ocorrencias ? JSON.parse(diario.ocorrencias) : []

  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-right-10 duration-500">
       {/* Header */}
       <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-6">
             <button onClick={onClose} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
             </button>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizando Registro</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <CalendarIcon className="w-6 h-6 text-blue-600" /> {new Date(diario.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
             </div>
          </div>
       </div>

       <div className="p-10 space-y-12">
          {/* Grid de Clima e Efetivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Condições Climáticas</p>
                <div className="flex justify-between">
                   {['Manhã', 'Tarde', 'Noite'].map((p, i) => {
                      const key = i === 0 ? 'weatherMorning' : i === 1 ? 'weatherAfternoon' : 'weatherNight'
                      const clima = CLIMA_MAP[diario[key]] || CLIMA_MAP.ensolarado
                      return (
                        <div key={p} className="text-center">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-2 mx-auto">
                              {clima.icon}
                           </div>
                           <p className="text-[8px] font-black text-slate-400 uppercase">{p}</p>
                        </div>
                      )
                   })}
                </div>
             </div>

             <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Efetivo em Campo</p>
                   <h4 className="text-3xl font-black mb-1">{diario.efetivos?.reduce((acc: number, curr: { role: string; count: number }) => acc + curr.count, 0) || 0} Trabalhadores</h4>
                   <p className="text-xs text-slate-400 font-medium">Distribuídos em {diario.efetivos?.length || 0} especialidades</p>
                </div>
                <Users className="w-16 h-16 text-slate-800" />
             </div>
          </div>

          {/* Atividades */}
          <div className="space-y-6">
             <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Hammer className="w-4 h-4 text-blue-600" /> Avanço de Atividades</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diario.atividades?.map((da) => (
                  <div key={da.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-sm font-black text-slate-800 mb-1">{da.atividade?.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{da.atividade?.location?.name}</p>
                     </div>
                     <div className="text-right">
                        <span className="text-lg font-black text-blue-600">{da.progress}%</span>
                        <p className="text-[8px] font-black text-slate-300 uppercase">Progresso</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Galeria de Fotos */}
          {diario.fotos && diario.fotos.length > 0 && (
            <div className="space-y-6">
               <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Camera className="w-4 h-4 text-pink-500" /> Galeria de Evidências</h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {diario.fotos.map((f) => (
                    <div key={f.id} className="aspect-square rounded-3xl overflow-hidden shadow-md group relative">
                       <Image src={f.url} alt={f.caption || 'Foto da obra'} fill className="object-cover transition-transform group-hover:scale-110" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                          <p className="text-[10px] font-bold text-white leading-tight">{f.caption}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* Notas e Ocorrências */}
          {(diario.notes || ocorrencias.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {diario.notes && (
                 <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Notas do Engenheiro</p>
                    <p className="text-sm font-medium text-amber-900 leading-relaxed">{diario.notes}</p>
                 </div>
               )}
               {ocorrencias.length > 0 && (
                 <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">Ocorrências Registradas</p>
                    <div className="space-y-3">
                       {(ocorrencias as { tipo: string; detalhe: string }[]).map((oc, i) => (
                         <div key={i} className="flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                            <p className="text-xs font-bold text-red-900">[{oc.tipo}] {oc.detalhe}</p>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          )}
       </div>
    </div>
  )
}
