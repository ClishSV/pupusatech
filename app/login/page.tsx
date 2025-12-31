"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr' // Usamos la nueva librería
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Cliente de Supabase para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Error: " + error.message)
      setLoading(false)
    } else {
      // Si entra, buscamos cuál es su restaurante
      // (Por ahora lo mandamos al home, luego haremos el redireccionamiento inteligente)
      router.push('/dashboard') 
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <img 
            src="/logo-icon.png" 
            alt="PupusaTech" 
            className="w-24 h-24 mx-auto mb-4 drop-shadow-md hover:scale-105 transition-transform" 
          />
          <h1 className="text-2xl font-black text-gray-900">Iniciar Sesión</h1>
          <p className="text-gray-500">Panel de Administración PupusaTech</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-orange-500 outline-none transition"
              placeholder="tu@correo.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-orange-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Entrando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          ¿No tienes cuenta? <a href="https://wa.me/50373933442" className="text-orange-600 font-bold hover:underline">Contactar Ventas</a>
        </div>
      </div>
    </div>
  )
}