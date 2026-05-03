'use client'

import { useState } from 'react'
import { Upload, X } from 'lucide-react'

interface ObraImportModalProps {
  obraId: string
  onClose: () => void
  onImported: () => void
}

export default function ObraImportModal({ obraId, onClose, onImported }: ObraImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [importErro, setImportErro] = useState('')

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
        onImported()
        onClose()
      } else {
        setImportErro(data.error || 'Falha na importação')
      }
    } catch (e) {
      setImportErro('Erro de conexão')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-12 animate-in zoom-in-95 duration-300">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Importar Cronograma</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">MS Project (XML) ou Excel (.xlsx)</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
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
            <button onClick={onClose} className="flex-1 py-4 font-black uppercase text-slate-400 tracking-widest text-[10px]">Cancelar</button>
            <button onClick={handleImportar} disabled={!importFile || importando} className="flex-1 bg-blue-600 text-white py-5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 disabled:opacity-50">
               {importando ? 'Sincronizando Dados...' : 'Iniciar Importação'}
            </button>
         </div>
      </div>
    </div>
  )
}
