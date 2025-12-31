"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // TU CORREO DE SUPER ADMIN (Cámbialo por el tuyo real)
  const SUPER_ADMIN_EMAIL = "reldicadmin@pupusatech.com"

  useEffect(() => {
    async function getData() {
      // 1. Verificar Usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // 2. Cargar sus Restaurantes
      // (Asumiendo que ya agregamos owner_id a la tabla restaurants)
      const { data: myRestaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id) // DESCOMENTAR ESTO CUANDO TENGAS RLS ACTIVADO 17 DIC 2025
      
      // NOTA TEMPORAL: Como aún no asignamos dueños en la DB, 
      // voy a mostrar TODOS los restaurantes para que veas la demo funcionar.
      // En producción, solo mostrarás los suyos.
      
      if (myRestaurants) setRestaurants(myRestaurants)
      setLoading(false)
    }
    getData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando tu imperio... 🏰</div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* NAVBAR DASHBOARD */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="Logo" className="h-10 w-auto" />
          
          <div className="flex flex-col leading-none">
            <span className="font-black text-xl text-gray-900 tracking-tight">PUPUSA<span className="text-orange-600">TECH</span></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Panel Dueño</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700">Salir</button>
        </div>
      </nav>

      {/* CONTENIDO */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Mis Restaurantes</h1>
            <p className="text-gray-500 mt-1">Gestiona tus sucursales y menús desde aquí.</p>
          </div>
          
          {/* LÓGICA DE PROTECCIÓN: Solo TÚ ves este botón */}
          {user?.email === SUPER_ADMIN_EMAIL && (
            <Link 
              href="/dashboard/new"
              className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center gap-2"
            >
              + Nueva Sucursal
            </Link>
          )}
          
        </div>

        {restaurants.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-400">No tienes restaurantes aún</h3>
            <p className="text-gray-400 text-sm mt-2">Contacta a soporte para activar tu primera sucursal.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => (
              <div key={rest.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center text-4xl border-2 border-white shadow-sm">
                    {rest.logo_url || '🍽️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{rest.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${rest.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-400 uppercase font-bold">{rest.status || 'Activo'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link 
                    href={`/${rest.slug}/admin`}
                    className="block w-full bg-orange-50 text-orange-700 font-bold py-3 rounded-xl text-center hover:bg-orange-100 transition border border-orange-100"
                  >
                    👨‍🍳 Ir a Cocina
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      href={`/${rest.slug}/admin/menu`}
                      className="bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-center hover:border-orange-300 hover:text-orange-600 transition text-sm"
                    >
                      📝 Editar Menú
                    </Link>
                    <Link 
                      href={`/${rest.slug}`}
                      target="_blank"
                      className="bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-center hover:border-blue-300 hover:text-blue-600 transition text-sm flex items-center justify-center gap-1"
                    >
                      🔗 Ver Link
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}