"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPER_ADMIN_EMAIL = "reldicadmin@pupusatech.com"

export default function Dashboard() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // ESTADOS DEL CORTE Z
  const [historyModalRest, setHistoryModalRest] = useState<any>(null)
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: myRestaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id) 
      
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

  // --- LÓGICA DE VENTAS (CORTE Z) ---
  const loadHistory = async (rest: any) => {
    setHistoryModalRest(rest)
    setLoadingHistory(true)
    
    // Obtener inicio y fin de hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', rest.id)
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false })

    if (data) setHistoryOrders(data)
    setLoadingHistory(false)
  }

  const isPupusaItem = (item: any) => {
    if (!item) return false;
    const catName = (item.category || '').toLowerCase();
    const itemName = (item.name || '').toLowerCase();
    const pupusaKeywords = ['pupusa', 'tradicional', 'especial', 'mixta', 'internacional', 'loca', 'birria'];
    return pupusaKeywords.some(kw => catName.includes(kw) || itemName.includes(kw));
  }

  const groupItems = (items: any[]) => {
    const grouped: Record<string, any> = {}
    items.forEach(item => {
      const key = `${item.id}-${item.dough || ''}`
      if (grouped[key]) {
        grouped[key].quantity += 1
      } else {
        grouped[key] = { ...item, quantity: 1 }
      }
    })
    return Object.values(grouped)
  }

  const calculateCorte = () => {
    const delivered = historyOrders.filter(o => o.status === 'delivered')
    const totalSales = delivered.reduce((sum, order) => sum + order.total, 0)
    
    let totalPupusas = 0;
    let totalBebidas = 0;
    let totalOtros = 0;

    delivered.forEach(order => {
      order.items.forEach((item: any) => {
        if (isPupusaItem(item)) {
          totalPupusas += item.price;
        } else if (item.category?.toLowerCase().includes('bebida')) {
          totalBebidas += item.price;
        } else {
          totalOtros += item.price;
        }
      })
    })

    return { totalSales, totalOrders: delivered.length, totalPupusas, totalBebidas, totalOtros }
  }

  const printCorteZ = () => {
    const stats = calculateCorte();
    const printWindow = window.open('', '', 'width=300,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; font-size: 12px; margin: 0; padding: 5px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid black; padding-bottom: 5px; }
            .title { font-size: 18px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { border-top: 2px solid black; margin-top: 10px; padding-top: 5px; font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">CORTE Z (DIARIO)</div>
            <div>${historyModalRest.name}</div>
            <div>Fecha: ${new Date().toLocaleDateString('es-SV')}</div>
            <div>Hora: ${new Date().toLocaleTimeString('es-SV')}</div>
          </div>
          <br/>
          <div class="row"><span>Órdenes Completadas:</span> <span>${stats.totalOrders}</span></div>
          <br/>
          <div class="row"><span>Ventas Pupusas:</span> <span>$${stats.totalPupusas.toFixed(2)}</span></div>
          <div class="row"><span>Ventas Bebidas:</span> <span>$${stats.totalBebidas.toFixed(2)}</span></div>
          <div class="row"><span>Ventas Extras/Postres:</span> <span>$${stats.totalOtros.toFixed(2)}</span></div>
          <br/>
          <div class="row total"><span>TOTAL EN CAJA:</span> <span>$${stats.totalSales.toFixed(2)}</span></div>
          <br/><br/><div style="text-align:center">--- FIN DEL CORTE ---</div><br/><br/>.
        </body>
      </html>
    `)
    printWindow.document.close(); printWindow.focus(); printWindow.print(); printWindow.close()
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
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

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Mis Restaurantes</h1>
            <p className="text-gray-500 mt-2 text-lg">Gestiona tus sucursales, cocinas y ventas desde aquí.</p>
          </div>
          
          {user?.email === SUPER_ADMIN_EMAIL && (
            <Link href="/dashboard/new" className="bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2 active:scale-95">
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
              const hasPhotoUrl = rest.logo_url && (rest.logo_url.startsWith('/') || rest.logo_url.startsWith('http'));
              const firstLetter = rest.name ? rest.name.charAt(0).toUpperCase() : '🍽️';

              return (
                <div key={rest.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                  
                  {/* CABECERA TARJETA */}
                  <div className="flex items-center gap-4 mb-6">
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

                  {/* BOTONES DE ADMINISTRACIÓN */}
                  <div className="mt-auto space-y-3">
                    
                    {/* BOTÓN NUEVO: CORTE DE CAJA (El dueño ve el dinero) */}
                    <button 
                      onClick={() => loadHistory(rest)}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 font-black py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span className="text-lg">📊</span> VENTAS Y CORTE Z
                    </button>

                    <Link 
                      href={`/${rest.slug}/admin`}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span className="text-lg">👨‍🍳</span> IR A COCINA
                    </Link>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Link href={`/${rest.slug}/mesero`} className="bg-gray-900 text-white font-bold py-3 rounded-xl text-center hover:bg-black transition-colors shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm">
                        <span className="text-lg">🤵</span> Mesero
                      </Link>
                      <Link href={`/${rest.slug}/admin/menu`} className="bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-center hover:border-orange-400 hover:text-orange-600 transition-colors active:scale-95 flex items-center justify-center gap-2 text-sm shadow-sm">
                        <span className="text-lg">📝</span> Editar Menú
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: CORTE Z Y AUDITORÍA (Solo Dueño)
          ========================================== */}
      {historyModalRest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left">
            
            {/* Header */}
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0 border-b-4 border-blue-500">
              <div>
                <h2 className="text-2xl font-black">Corte del Día</h2>
                <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setHistoryModalRest(null)} className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition font-bold">✕</button>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 font-bold animate-pulse">Calculando ventas...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-6">
                
                {/* RESUMEN FINANCIERO */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
                  <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs mb-4">Resumen de Caja</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl">
                      <p className="text-green-800 font-bold text-xs mb-1 uppercase tracking-wide">Efectivo Total</p>
                      <p className="text-3xl font-black text-green-700">${calculateCorte().totalSales.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
                      <p className="text-blue-800 font-bold text-xs mb-1 uppercase tracking-wide">Órdenes Hoy</p>
                      <p className="text-3xl font-black text-blue-700">{calculateCorte().totalOrders}</p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🫓 Ventas Pupusas:</span>
                      <span className="text-gray-900">${calculateCorte().totalPupusas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🥤 Ventas Bebidas:</span>
                      <span className="text-gray-900">${calculateCorte().totalBebidas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🍰 Ventas Extras:</span>
                      <span className="text-gray-900">${calculateCorte().totalOtros.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={printCorteZ}
                    className="w-full mt-6 bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    🖨️ Imprimir Corte Z
                  </button>
                </div>

                {/* AUDITORÍA (RECLAMOS) */}
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs mb-4">Auditoría de Pedidos (Hoy)</h3>
                  
                  {historyOrders.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400 font-medium text-sm">
                      Aún no hay pedidos terminados hoy.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historyOrders.map(order => (
                        <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${order.status === 'delivered' ? 'border-green-500' : 'border-red-500'}`}>
                          <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                            <div>
                              <span className="font-black text-lg text-gray-900 leading-none">{order.table_number}</span>
                              <p className="text-[10px] text-gray-500 font-mono mt-1 font-bold">{formatTime(order.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {order.status === 'delivered' ? '✅ Entregado' : '❌ Cancelado'}
                              </span>
                              <p className="font-black text-gray-900 mt-1">${order.total.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            {groupItems(order.items).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600 bg-gray-50 p-1.5 rounded">
                                <span><strong className="text-gray-900">{item.quantity}x</strong> {item.name} {item.dough ? `(${item.dough})` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  )
}