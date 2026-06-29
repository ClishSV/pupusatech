"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'

const NOTIFICATION_SOUND = "/ding.mp3"

// ETIQUETAS VISUALES PARA LAS CATEGORÍAS MAESTRAS EN EL FILTRO
const MASTER_LABELS: Record<string, string> = {
  'PUPUSAS': '🫓 Pupusas',
  'ENTRADAS': '🥗 Entradas',
  'PLATOS_FUERTES': '🍛 Platos Fuertes',
  'ANTOJITOS': '🥟 Antojitos',
  'SOPAS': '🥣 Sopas',
  'MEXICANA': '🌮 Mexicana',
  'BEBIDAS': '🥤 Bebidas',
  'POSTRES': '🍰 Postres',
  'EXTRAS': '✨ Extras',
  'PROMOCIONES': '🏷️ Promociones',
  'OTROS': '🍽️ Otros'
};

export default function KitchenPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [orders, setOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // MAPA DE MENÚ PARA ENRUTAMIENTO INTELIGENTE
  const [menuMap, setMenuMap] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)

  // ESTADOS DE FILTRO PERSONALIZADO POR ESTACIÓN
  const [filterTypes, setFilterTypes] = useState<string[]>(['local', 'takeout', 'delivery'])
  const [filterCategories, setFilterCategories] = useState<string[]>([
    'PUPUSAS', 'ENTRADAS', 'PLATOS_FUERTES', 'ANTOJITOS', 'SOPAS', 'MEXICANA', 'BEBIDAS', 'POSTRES', 'EXTRAS', 'PROMOCIONES', 'OTROS'
  ])

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

  const playNotificationSound = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => setAudioEnabled(false))
    }
  }

  const enableAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio(NOTIFICATION_SOUND)
    audioRef.current.play().then(() => {
      audioRef.current?.pause()
      audioRef.current!.currentTime = 0
      setAudioEnabled(true)
    }).catch(e => console.error(e))
  }

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)

    async function fetchInitialData() {
      if (!slug) return

      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      // Descarga inicial de pedidos activos en cocina
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restData.id)
        .in('status', ['pending', 'cooking'])
        .order('created_at', { ascending: true })

      if (ordersData) setOrders(ordersData)

      // Descarga inicial del menú para mapear las Categorías Maestras
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restData.id)

      if (menuData) {
        const map: Record<string, any> = {}
        menuData.forEach(item => { map[item.id] = item })
        setMenuMap(map)
      }

      // Escuchador Realtime para inserciones y actualizaciones
      const channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restData.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT' && ['pending', 'cooking'].includes(payload.new.status)) {
              setOrders((prev) => [...prev, payload.new])
              playNotificationSound()
            } else if (payload.eventType === 'UPDATE') {
              if (['pending', 'cooking'].includes(payload.new.status)) {
                setOrders(prev => {
                  const exists = prev.find(o => o.id === payload.new.id);
                  if (exists) return prev.map(o => o.id === payload.new.id ? payload.new : o);
                  return [...prev, payload.new]; 
                });
              } else {
                setOrders(prev => prev.filter(o => o.id !== payload.new.id));
              }
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    fetchInitialData()
  }, [slug])

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'ready' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  const getTargetTime = (created_at: string, wait_time: number | undefined) => {
    if (!wait_time) return null;
    const d = new Date(new Date(created_at).getTime() + wait_time * 60000);
    return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  }

  // LÓGICAS DE GESTIÓN DE FILTROS EN COLA
  const toggleTypeFilter = (type: string) => {
    setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const toggleCategoryFilter = (cat: string) => {
    setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  if (!restaurant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4 animate-bounce">👨‍🍳</div><p className="text-xl text-gray-600 font-semibold">Cargando cocina...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative font-sans pb-32">
      
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-6 animate-bounce">🔔</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Cocina</h2>
          <p className="text-gray-300 mb-8 text-sm max-w-xs text-center">Toca el botón para empezar a recibir pedidos con sonido.</p>
          <button onClick={enableAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform active:scale-95">
            🔊 INICIAR TURNO
          </button>
        </div>
      )}

      {/* HEADER COCINA */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col gap-4 border-l-8 border-orange-500 sticky top-4 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-3xl">👨‍🍳</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                <p className="text-gray-500 text-sm font-medium">Cocina en Vivo</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 💡 CORREGIDO: Usando 'showFilters' en lugar de variables inexistentes */}
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`px-4 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 active:scale-95 ${showFilters ? 'bg-orange-500 border-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
            >
              ⚙️ {showFilters ? 'Cerrar Ajustes' : 'Configurar Estación'}
            </button>
            <div className="bg-orange-600 text-white px-5 py-2 rounded-xl font-black shadow-lg text-xl min-w-[60px] text-center">
              {orders.length}
            </div>
          </div>
        </div>

        {/* 💡 CORREGIDO: El panel de control usa 'showFilters' */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in space-y-4 shadow-inner">
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">1. Tipos de pedido de esta estación:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'local', label: '🍽️ Comer Aquí' },
                  { id: 'takeout', label: '🛍️ Para Llevar' },
                  { id: 'delivery', label: '🛵 Domicilio' }
                ].map(type => {
                  const active = filterTypes.includes(type.id);
                  return (
                    <button key={type.id} onClick={() => toggleTypeFilter(type.id)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${active ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm' : 'bg-white border-gray-200 text-gray-400'}`}>
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">2. Platillos que prepara esta estación:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MASTER_LABELS).map(([id, label]) => {
                  const active = filterCategories.includes(id);
                  return (
                    <button key={id} onClick={() => toggleCategoryFilter(id)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${active ? 'bg-blue-100 border-blue-400 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-400'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>
              {/* 💡 CORREGIDO: Escapando caracteres especiales de HTML */}
              <p className="text-[10px] text-gray-400 mt-2 font-medium">
                Tip: Si desactivas &quot;Bebidas&quot; en esta pantalla, las bebidas no aparecerán en tus tarjetas, ¡ideal para estaciones separadas!
              </p>
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 text-center">
            <div className="text-7xl mb-4 opacity-50">🍳</div>
            <h3 className="text-xl font-bold text-gray-600 mb-1">Todo tranquilo por aquí</h3>
            <p className="text-sm text-gray-400">Los pedidos aparecerán automáticamente</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const isDelivery = order.order_type === 'delivery';
            const isTakeout = order.order_type === 'takeout';
            const customerInfo = order.customer_info || {};
            const targetTime = getTargetTime(order.created_at, customerInfo.wait_time);

            // ENRUTAMIENTO INTELIGENTE: Filtramos los items que SÍ pertenecen a las categorías de esta estación
            const filteredItems = order.items.filter((item: any) => {
              const masterCat = menuMap[item.id]?.master_category || 'OTROS';
              return filterCategories.includes(masterCat);
            });

            // Si esta estación no debe preparar nada de esta orden, u oculta este tipo de pedido, escondemos la tarjeta
            const shouldShowType = filterTypes.includes(order.order_type || 'local');
            if (filteredItems.length === 0 || !shouldShowType) return null;

            return (
            <div 
              key={order.id} 
              className={`bg-white rounded-2xl shadow-md overflow-hidden border-2 transition-all flex flex-col hover:shadow-xl ${
                order.status === 'pending' ? 'border-gray-800' : 'border-green-500'
              } ${isDelivery ? 'ring-4 ring-purple-500/30' : ''}`}
            >
              <div className={`p-4 text-white flex justify-between items-start ${
                 order.status === 'pending' ? (isDelivery ? 'bg-purple-900' : 'bg-gray-900') : 'bg-green-600'
              }`}>
                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tight leading-tight flex items-center gap-2">
                    {isDelivery ? `🛵 Domicilio` : isTakeout ? `🛍️ Llevar` : order.table_number}
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">#{order.id.slice(0,4).toUpperCase()}</span>
                  </span>
                  
                  {(isDelivery || isTakeout) && (
                    <span className="text-sm font-bold text-white/90 mt-1">
                      👤 {customerInfo.name || order.table_number}
                    </span>
                  )}

                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-2">
                    {order.status === 'pending' ? '⏳ POR CONFIRMAR' : '🔥 EN PLANCHA'}
                  </span>
                  
                  {targetTime && (
                    <div className="mt-2 inline-block bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded shadow-sm w-fit">
                      ⏱️ ENTREGAR: {targetTime}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">{formatTime(order.created_at)}</div>
                </div>
              </div>

              {/* LISTA DE ITEMS FILTRADA INTELIGENTEMENTE */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 bg-gray-50/50">
                {groupItems(filteredItems).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shadow-sm ${order.status === 'pending' ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-600'}`}>
                        {item.quantity}
                      </span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        <div className="flex gap-1 mt-1">
                            {item.dough === 'maiz' && <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">🌽 MAÍZ</span>}
                            {item.dough === 'arroz' && <span className="inline-block bg-white text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-300 shadow-sm">🍚 ARROZ</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACCIONES DE COCINA */}
              <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { if(confirm('¿Rechazar este pedido?')) updateStatus(order.id, 'cancelled') }} className="bg-red-50 border-2 border-red-100 text-red-500 font-bold py-3 rounded-xl hover:bg-red-100 transition-all text-xs uppercase tracking-wide active:scale-95">
                      ✕ Rechazar
                    </button>
                    <button onClick={() => updateStatus(order.id, 'cooking')} className="bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg transition-all transform active:scale-95 text-xs uppercase tracking-wide">
                      🔥 A la plancha
                    </button>
                  </div>
                )}
                
                {order.status === 'cooking' && (
                  <div className="grid grid-cols-4 gap-2">
                    {/* BOTÓN DE ANULACIÓN POR ABANDONO */}
                    <button 
                      onClick={() => { if(confirm('⚠️ ¿Anular esta orden por abandono del cliente? Desaparecerá de todas las pantallas y no se cobrará.')) updateStatus(order.id, 'cancelled') }} 
                      className="col-span-1 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl flex items-center justify-center font-bold text-sm active:scale-95"
                      title="Anular Pedido"
                    >
                      ✕
                    </button>
                    <button onClick={() => updateStatus(order.id, 'ready')} className="col-span-3 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95">
                      <span>➡️</span> PASAR A EMPAQUE
                    </button>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}