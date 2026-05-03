import { MapPin, User, ArrowLeft } from 'lucide-react';

interface ObraHeaderProps {
  obra: any;
  progressPercent: number;
  currentStep: { label: string, info: string };
  stepIndex: number;
}

export default function ObraHeader({ obra, progressPercent, currentStep, stepIndex }: ObraHeaderProps) {
  const steps = [
    { label: 'Cronograma' },
    { label: 'Programação' },
    { label: 'Controle (RDO)' },
    { label: 'Análise' }
  ];

  return (
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
               {[0,1,2,3].map((i) => (
                 <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${i <= stepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
               ))}
            </div>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm">
                  {stepIndex !== -1 && stepIndex < 4 ? stepIndex + 1 : '✓'}
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight mb-0.5">
                     {currentStep.label}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
                    {currentStep.info}
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
