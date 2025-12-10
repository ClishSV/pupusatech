"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'

const NOTIFICATION_SOUND = "/ding.mp3"

export default function KitchenPage() {
  const params = useParams()
  const slug = params?.slug as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [restaurant, setRestaurant] = useState<any>(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // --- AGRUPACIÓN ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // --- AUDIO ---
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

  // --- CARGA DE DATOS ---
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)

    async function fetchInitialData() {
      if (!slug) return

      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restData.id)
        .neq('status', 'delivered') // No mostrar entregados
        .neq('status', 'cancelled') // NO MOSTRAR LOS CANCELADOS/RECHAZADOS
        .order('created_at', { ascending: true })

      if (ordersData) setOrders(ordersData)

      const channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restData.id}`
          },
          (payload) => {
            // Solo agregar si no es status 'cancelled' (por seguridad)
            if (payload.new.status !== 'cancelled') {
              setOrders((prev) => [...prev, payload.new])
              playNotificationSound()
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    fetchInitialData()
  }, [slug])

  // --- ACTUALIZAR ESTADOS ---
  const updateStatus = async (orderId: string, newStatus: string) => {
    // 1. UI Optimista
    if (newStatus === 'cancelled' || newStatus === 'delivered') {
      // Si se cancela o entrega, lo quitamos de la vista inmediatamente (o con delay)
      if (newStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== orderId))
      } else {
        // Delivered tiene un delay pequeño para ver el cambio
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        setTimeout(() => {
          setOrders(prev => prev.filter(o => o.id !== orderId))
        }, 2000)
      }
    } else {
      // Cambio normal (pending -> cooking)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }

    // 2. Base de Datos
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  if (!restaurant) return <div className="p-10 text-center">Cargando cocina... 👨‍🍳</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      
      {/* PANTALLA BLOQUEO AUDIO */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-4 animate-bounce">👆</div>
          <h2 className="text-3xl font-bold mb-4">Activar Panel</h2>
          <button onClick={enableAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl">
            INICIAR TURNO 🔊
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center border-l-8 border-orange-500 sticky top-0 z-10 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{restaurant.name}</h1>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <p className="text-gray-500 text-sm">En Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <a href={`/${slug}/admin/menu`} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2 text-sm">
              📝 Menú
            </a>
            <div className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg text-xl">
              {orders.length}
            </div>
        </div>
      </div>

      {/* GRILLA */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <p className="text-xl">Todo limpio, chef.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all flex flex-col ${
                order.status === 'pending' ? 'border-gray-400 animate-pulse' : // PENDIENTE = GRIS/NEUTRO
                order.status === 'cooking' ? 'border-yellow-400' : 
                'border-green-500 bg-green-50'
              }`}
            >
              {/* CABECERA */}
              <div className={`p-3 text-white flex justify-between items-center ${
                 order.status === 'pending' ? 'bg-gray-700' : // PENDIENTE = OSCURO
                 order.status === 'cooking' ? 'bg-yellow-500' : 
                 'bg-green-500'
              }`}>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl">{order.table_number}</span>
                  {order.status === 'pending' && <span className="text-[10px] bg-red-500 px-1 rounded uppercase tracking-wider">Por Confirmar</span>}
                </div>
                <span className="text-xs font-bold bg-black bg-opacity-20 px-2 py-1 rounded">
                  {formatTime(order.created_at)}
                </span>
              </div>

              {/* LISTA */}
              <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-80">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="bg-white border-2 border-gray-200 text-gray-700 w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-md shadow-sm">
                        {item.quantity}
                      </span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        {item.dough === 'maiz' && <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1 rounded border border-yellow-200">🌽 MAÍZ</span>}
                        {item.dough === 'arroz' && <span className="inline-block bg-white text-gray-600 text-[10px] font-bold px-1 rounded border border-gray-300 shadow-sm">🍚 ARROZ</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER ACCIONES */}
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                
                {/* ESTADO PENDIENTE: VALIDAR O RECHAZAR */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        if(confirm('¿Rechazar este pedido? Se borrará de la lista.')) {
                          updateStatus(order.id, 'cancelled')
                        }
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 rounded-xl transition text-sm"
                    >
                      ❌ Rechazar
                    </button>
                    <button 
                      onClick={() => updateStatus(order.id, 'cooking')}
                      className="bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95 text-sm"
                    >
                      ✅ ACEPTAR
                    </button>
                  </div>
                )}

                {/* ESTADO COCINANDO */}
                {order.status === 'cooking' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'ready')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🛎️</span> LISTO
                  </button>
                )}

                {/* ESTADO LISTO */}
                {order.status === 'ready' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow transition"
                  >
                    📦 ENTREGADO
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}