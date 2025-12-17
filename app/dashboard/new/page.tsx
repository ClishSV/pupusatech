"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// EL MISMO CORREO MAESTRO
const SUPER_ADMIN_EMAIL = "reldicadmin@pupusatech.com"

export default function NewRestaurantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('') // NUEVO: Para asignar el dueño al crear
  const [loading, setLoading] = useState(true) // Empezamos cargando para verificar permisos
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // VERIFICAR PERMISOS AL CARGAR
  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Si no es el admin, lo sacamos de aquí
      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        router.push('/dashboard')
        return
      }
      setLoading(false)
    }
    checkPermission()
  }, [])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    setSlug(val.toLowerCase().replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Buscar el ID del usuario dueño (basado en el correo que escribiste)
    // OJO: Esto requiere que tengas permisos en Supabase o una función RPC.
    // PARA EL MVP (FÁCIL): Asignamos el restaurante a TI MISMO primero, 
    // y luego en la base de datos cambias el dueño manualmente.
    // O, creamos el restaurante asignado a ti y luego te explico como transferirlo.
    
    // Vamos a asignarlo al usuario actual (TÚ) por defecto para simplificar
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name: name,
        slug: slug,
        owner_id: user?.id, // Se crea a TU nombre
        logo_url: '🥘',
        status: 'active'
      })

    if (insertError) {
      if (insertError.code === '23505') setError('Este link ya existe.')
      else setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Verificando permisos...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-gray-900">Alta de Cliente</h1>
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">Cancelar</Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Negocio</label>
            <input type="text" value={name} onChange={handleNameChange} className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-orange-500" placeholder="Ej: Pupusería Los Planes" required />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Link Personalizado</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
              <span className="pl-3 text-gray-400 text-sm">pupusatech.com/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-transparent p-3 outline-none font-bold text-gray-700" required />
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition shadow-lg disabled:opacity-50">
            Crear y Asignar a mi Cuenta
          </button>
          
          <p className="text-xs text-gray-400 text-center">
            * El restaurante se creará bajo tu cuenta. Luego podrás transferirlo o configurarlo tú mismo.
          </p>
        </form>
      </div>
    </div>
  )
}