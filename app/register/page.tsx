'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, User, Mail, Lock, Building, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, workspaceName })
      })

      if (res.ok) {
        router.push('/login?registered=true')
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao registrar conta.')
      }
    } catch (err) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
         <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[2.5rem] w-full max-w-md relative z-10">
        <div className="text-center mb-10">
           <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
              <Rocket className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-3xl font-black text-white tracking-tight italic">NOVA CONTA</h1>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Inicie seu Workspace de Engenharia</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 mb-8 text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
             <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
             <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium text-sm"
                  placeholder="Seu nome"
                  required
                />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
             <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium text-sm"
                  placeholder="seu@email.com"
                  required
                />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
             <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium text-sm"
                  placeholder="••••••••"
                  required
                />
             </div>
          </div>

          <div className="space-y-2 pb-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa / Obra</label>
             <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium text-sm"
                  placeholder="Ex: Construtora Alpha"
                  required
                />
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Registrar e Iniciar'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-8">
          Já tem conta? <a href="/login" className="text-blue-500 hover:text-blue-400">Entrar agora</a>
        </p>
      </div>
    </div>
  )
}
