import { MapPin, User, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { Obra } from '@/lib/types';
import { CockpitStats } from '@/hooks/useObraData';

interface ObraHeaderProps {
  obra: Obra;
  stats: CockpitStats | null;
  critCount: number;
}

export default function ObraHeader({ obra, stats, critCount }: ObraHeaderProps) {
  const isHealthy = critCount === 0 && (stats?.desvio ?? 0) >= -5;
  const isWarning = critCount > 0 || ((stats?.desvio ?? 0) < -5 && (stats?.desvio ?? 0) >= -10);
  const isCritical = (stats?.desvio ?? 0) < -10;

  const statusColor = isHealthy ? 'text-emerald-500 bg-emerald-50 border-emerald-100' :
                      isWarning ? 'text-amber-500 bg-amber-50 border-amber-100' :
                                  'text-red-500 bg-red-50 border-red-100';
  
  const StatusIcon = isHealthy ? CheckCircle2 :
                     isWarning ? AlertTriangle : Activity;
                     
  const statusLabel = isHealthy ? 'Obra Saudável' :
                      isWarning ? 'Atenção Necessária' : 'Risco Crítico';

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 no-print">
      <div className="flex items-center gap-6 w-full md:w-auto">
        <button 
          onClick={() => window.history.back()} 
          className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-blue-100 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
             {obra.nome}
          </h1>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
             <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-300" /> {obra.endereco || 'Local não definido'}</span>
             <span className="hidden sm:flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-300" /> {obra.engenheiro || 'Engenheiro'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 w-full md:w-auto flex-wrap md:flex-nowrap">
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${statusColor}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-widest">{statusLabel}</span>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6 bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Realizado</span>
            <span className="text-lg font-black text-slate-800">{Math.round(stats?.progresso ?? 0)}%</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planejado</span>
            <span className="text-lg font-black text-slate-600">{Math.round(stats?.progressoPlanejado ?? 0)}%</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desvio</span>
            <span className={`text-lg font-black ${(stats?.desvio ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {(stats?.desvio ?? 0) > 0 ? '+' : ''}{Math.round(stats?.desvio ?? 0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
