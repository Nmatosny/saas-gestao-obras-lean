'use client'

import { Users2, Hammer, Shield, Construction, Search, Plus } from 'lucide-react'

export default function EquipePage() {
  return (
    <div className="p-12">
      <div className="mb-12">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Capital Humano</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recursos & Equipes</h1>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-20 text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-500">
              <Users2 className="w-10 h-10" />
           </div>
           <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Módulo em Desenvolvimento</h2>
           <p className="text-slate-400 font-medium max-w-md mx-auto mb-10">
              Estamos integrando a gestão de alocação de equipes e controle de produtividade por oficial.
           </p>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <Shield className="w-6 h-6 text-slate-400 mx-auto mb-4" />
                 <p className="text-[10px] font-black uppercase text-slate-400">Controle de EPI</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <Hammer className="w-6 h-6 text-slate-400 mx-auto mb-4" />
                 <p className="text-[10px] font-black uppercase text-slate-400">Produtividade</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <Construction className="w-6 h-6 text-slate-400 mx-auto mb-4" />
                 <p className="text-[10px] font-black uppercase text-slate-400">Alocação</p>
              </div>
           </div>
        </div>
    </div>
  )
}
