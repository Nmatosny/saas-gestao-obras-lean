'use client'

import { useState } from 'react'
import { 
  Rocket, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Activity,
  X
} from 'lucide-react'

interface WizardStep {
  title: string
  description: string
  icon: React.ReactNode
  target: string
}

export default function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: WizardStep[] = [
    {
      title: 'Bem-vindo ao Cockpit',
      description: 'Este é o seu centro de comando. Aqui você verá alertas inteligentes e a saúde global da sua obra.',
      icon: <Rocket className="w-8 h-8 text-blue-600" />,
      target: 'overview'
    },
    {
      title: 'Plano Mestre',
      description: 'O primeiro passo é importar seu cronograma (Excel ou XML). Isso cria a espinha dorsal do projeto.',
      icon: <Layers className="w-8 h-8 text-indigo-600" />,
      target: 'planejamento'
    },
    {
      title: 'Ritmo de Produção',
      description: 'Na aba de Produção, você seleciona quais tarefas serão atacadas na semana (Programação Semanal).',
      icon: <Calendar className="w-8 h-8 text-emerald-600" />,
      target: 'campo'
    },
    {
      title: 'Controle Real',
      description: 'No canteiro, use o Medição para lançar o avanço diário. O sistema recalcula o forecast automaticamente.',
      icon: <Activity className="w-8 h-8 text-amber-600" />,
      target: 'gestao'
    }
  ]

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
    else onClose()
  }

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
       <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden relative border border-white/20">
          
          <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors">
             <X className="w-5 h-5 text-slate-300" />
          </button>

          <div className="p-12">
             <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 animate-in zoom-in-95 duration-500">
                {step.icon}
             </div>

             <div className="space-y-4 mb-12">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Passo {currentStep + 1} de {steps.length}</p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{step.title}</h2>
                <p className="text-slate-500 font-medium leading-relaxed">{step.description}</p>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={prev} 
                  disabled={currentStep === 0}
                  className="flex-1 py-4 px-6 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 disabled:opacity-0 transition-all flex items-center justify-center gap-2"
                >
                   <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button 
                  onClick={next}
                  className="flex-1 py-5 px-6 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                   {currentStep === steps.length - 1 ? (
                     <>Começar Agora <CheckCircle2 className="w-4 h-4" /></>
                   ) : (
                     <>Próximo <ChevronRight className="w-4 h-4" /></>
                   )}
                </button>
             </div>
          </div>

          <div className="bg-slate-50 p-6 flex justify-center gap-2">
             {steps.map((_, i) => (
               <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep === i ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
             ))}
          </div>
       </div>
    </div>
  )
}
