'use client'

import { FileText } from 'lucide-react'

export default function DocsPage() {
  return (
    <div className="p-12">
      <div className="mb-12">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Engenharia de Projetos</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Documentos Técnicos</h1>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-20 text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mb-8 text-pink-500">
              <FileText className="w-10 h-10" />
           </div>
           <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Central de Projetos (GED)</h2>
           <p className="text-slate-400 font-medium max-w-md mx-auto mb-10">
              Gerencie plantas, memoriais e documentos de licenciamento vinculados diretamente às atividades.
           </p>
           <div className="flex gap-4">
              <div className="bg-slate-100 text-slate-400 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200">Módulo em Desenvolvimento</div>
           </div>
        </div>
    </div>
  )
}
