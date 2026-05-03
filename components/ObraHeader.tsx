import { MapPin, User, ArrowLeft, Rocket, CheckCircle2, Circle } from 'lucide-react';
import { Obra } from '@/lib/types';

interface ObraHeaderProps {
  obra: Obra;
  progressPercent: number;
  currentStep: { label: string, info: string };
  stepIndex: number;
}

export default function ObraHeader({ obra, progressPercent, currentStep, stepIndex }: ObraHeaderProps) {
  return (
    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
      
      <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
         <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
               <button 
                 onClick={() => window.history.back()} 
                 className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-blue-100"
               >
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Workspace Ativo</span>
               </div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 italic leading-tight">
               {obra.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
               <span className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center"><MapPin className="w-3 h-3 text-slate-300" /></div>
                  {obra.endereco || 'Localização não definida'}
               </span>
               <span className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center"><User className="w-3 h-3 text-slate-300" /></div>
                  {obra.engenheiro || 'Engenheiro Responsável'}
               </span>
            </div>
         </div>

         {/* Jornada do Engenheiro */}
         <div className="lg:w-[500px] bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-600/20 transition-all" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-400" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Jornada de Implantação</p>
               </div>
               <span className="text-xs font-black text-white/50 bg-white/5 px-3 py-1 rounded-lg">{progressPercent}%</span>
            </div>

            <div className="flex gap-2 mb-8 relative z-10">
               {[0,1,2,3].map((i) => (
                 <div key={i} className="flex-1">
                    <div className={`h-1.5 w-full rounded-full transition-all duration-1000 ${i <= stepIndex ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
                 </div>
               ))}
            </div>

            <div className="flex items-start gap-5 relative z-10">
               <div className="w-14 h-14 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center text-xl font-black shrink-0 backdrop-blur-md">
                  {stepIndex !== -1 && stepIndex < 4 ? stepIndex + 1 : <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate mb-1">
                     {currentStep.label}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                    {currentStep.info}
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
