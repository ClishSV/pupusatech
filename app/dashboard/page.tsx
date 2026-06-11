"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// TU CORREO DE SUPER ADMIN
const SUPER_ADMIN_EMAIL = "reldicadmin@pupusatech.com"

export default function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
      const { data: myRestaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id) // RLS Activado
      
      if (myRestaurants) setRestaurants(myRestaurants)
      setLoading(false)
    }
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-gray-500">Cargando tu imperio... 🏰</div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* NAVBAR DASHBOARD */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="Logo" className="h-10 w-auto" />
          
          <div className="flex flex-col leading-none">
            <span className="font-black text-xl text-gray-900 tracking-tight">PUPUSA<span className="text-orange-600">TECH</span></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Panel Dueño</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block font-medium">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Salir</button>
        </div>
      </nav>

      {/* CONTENIDO */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Mis Restaurantes</h1>
            <p className="text-gray-500 mt-2 text-lg">Gestiona tus sucursales, cocinas y menús desde aquí.</p>
          </div>
          
          {/* LÓGICA DE PROTECCIÓN: Solo TÚ ves este botón */}
          {user?.email === SUPER_ADMIN_EMAIL && (
            <Link 
              href="/dashboard/new"
              className="bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2 active:scale-95"
            >
              <span className="text-xl">+</span> Nueva Sucursal
            </Link>
          )}
        </div>

        {restaurants.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 shadow-sm">
            <div className="text-6xl mb-4 opacity-50">🏪</div>
            <h3 className="text-2xl font-bold text-gray-600">No tienes restaurantes aún</h3>
            <p className="text-gray-400 mt-2">Contacta a soporte para activar tu primera sucursal.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {restaurants.map((rest) => {
              
              // LOGICA VISUAL DEL LOGO (Igual que en el menú)
              const hasPhotoUrl = rest.logo_url && (rest.logo_url.startsWith('/') || rest.logo_url.startsWith('http'));
              const firstLetter = rest.name ? rest.name.charAt(0).toUpperCase() : '🍽️';

              return (
                <div key={rest.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                  
                  {/* CABECERA TARJETA */}
                  <div className="flex items-center gap-4 mb-8">
                    {/* CONTENEDOR LOGO */}
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center text-3xl border-2 border-white shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                      {hasPhotoUrl ? (
                         <img src={rest.logo_url} alt={rest.name} className="w-full h-full object-cover" />
                      ) : (
                         <span className="font-black text-orange-500">{rest.logo_url || firstLetter}</span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-black text-xl text-gray-900 leading-tight line-clamp-2">{rest.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${rest.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">
                          {rest.status === 'active' ? 'Operando' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div className="mt-auto space-y-3">
                    
                    {/* BOTÓN PRIMARIO: COCINA */}
                    <Link 
                      href={`/${rest.slug}/admin`}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span className="text-xl">👨‍🍳</span>
                      <span>IR A COCINA</span>
                    </Link>
                    
                    {/* BOTONES SECUNDARIOS */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link 
                        href={`/${rest.slug}/mesero`}
                        className="bg-gray-900 text-white font-bold py-3.5 rounded-xl text-center hover:bg-black transition-colors shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
                      >
                        <span className="text-lg">🤵</span> Mesero
                      </Link>
                      
                      <Link 
                        href={`/${rest.slug}/admin/menu`}
                        className="bg-white border-2 border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-center hover:border-orange-400 hover:text-orange-600 transition-colors active:scale-95 flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <span className="text-lg">📝</span> Menú
                      </Link>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}