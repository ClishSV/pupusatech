"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'

const NOTIFICATION_SOUND = "/ding.mp3"

export default function KitchenPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [orders, setOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const groupItems = (items: any[]) => {
    const grouped: Record<string, any> = {}
    items.forEach(item => {
      const key = `${item.id}-${item.dough || ''}`
      if (grouped[key]) { grouped[key].quantity += 1 } 
      else { grouped[key] = { ...item, quantity: 1 } }
    })
    return Object.values(grouped)
  }

  const playNotificationSound = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) playPromise.catch(() => setAudioEnabled(false))
  }

  const enableAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio(NOTIFICATION_SOUND)
    audioRef.current.play().then(() => {
      audioRef.current?.pause(); audioRef.current!.currentTime = 0; setAudioEnabled(true)
    }).catch(e => console.error(e))
  }

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)

    async function fetchInitialData() {
      if (!slug) return
      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      // LA COCINA SOLO VE PENDIENTE Y COCINANDO
      const { data: ordersData } = await supabase.from('orders').select('*')
        .eq('restaurant_id', restData.id)
        .in('status', ['pending', 'cooking'])
        .order('created_at', { ascending: true })

      if (ordersData) setOrders(ordersData)

      const channel = supabase.channel('kitchen-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restData.id}` },
          (payload) => {
            if (payload.new.status === 'pending') {
              setOrders((prev) => [...prev, payload.new])
              playNotificationSound()
            }
          }
        ).subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    fetchInitialData()
  }, [slug])

  // AHORA LA COCINA SOLO MANDA A EMPAQUE (ready) O CANCELA
  const updateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'ready' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId)) // Desaparece de la cocina
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })

  if (!restaurant) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">Cargando cocina...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative font-sans">
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-6 animate-bounce">🔔</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Cocina</h2>
          <button onClick={enableAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform active:scale-95">🔊 INICIAR TURNO</button>
        </div>
      )}

      {/* HEADER COCINA LIMPIO */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center border-l-8 border-orange-500 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-3xl">👨‍🍳</div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{restaurant.name}</h1>
            <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Estación de Preparación
            </p>
          </div>
        </div>
        <div className="bg-orange-600 text-white px-5 py-2 rounded-xl font-black shadow-lg text-xl">{orders.length}</div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 text-center">
            <div className="text-7xl mb-4 opacity-50">🍳</div>
            <h3 className="text-xl font-bold text-gray-600 mb-1">Parrilla limpia</h3>
            <p className="text-sm text-gray-400">Esperando órdenes...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const isDelivery = order.order_type === 'delivery';
            const isTakeout = order.order_type === 'takeout';
            return (
            <div key={order.id} className={`bg-white rounded-2xl shadow-md overflow-hidden border-2 transition-all flex flex-col ${order.status === 'pending' ? 'border-gray-800' : 'border-green-500'}`}>
              <div className={`p-4 text-white flex justify-between items-start ${order.status === 'pending' ? 'bg-gray-900' : 'bg-green-600'}`}>
                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tight leading-tight flex items-center gap-2">
                    {isDelivery ? `🛵 Domicilio` : isTakeout ? `🛍️ Llevar` : order.table_number}
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">#{order.id.slice(0,4).toUpperCase()}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-2">
                    {order.status === 'pending' ? '⏳ POR CONFIRMAR' : '🔥 EN PLANCHA'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded">{formatTime(order.created_at)}</div>
                </div>
              </div>

              {/* LISTA SIN PRECIOS, SOLO COMIDA */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 bg-gray-50/50">
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shadow-sm ${order.status === 'pending' ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-600'}`}>
                        {item.quantity}
                      </span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        <div className="flex gap-1 mt-1">
                            {item.dough === 'maiz' && <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md">🌽 MAÍZ</span>}
                            {item.dough === 'arroz' && <span className="inline-block bg-white text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-300 shadow-sm">🍚 ARROZ</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACCIONES DE COCINA (PASAR A EMPAQUE) */}
              <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { if(confirm('¿Rechazar este pedido?')) updateStatus(order.id, 'cancelled') }} className="bg-red-50 text-red-500 font-bold py-3 rounded-xl hover:bg-red-100 transition-all text-xs uppercase tracking-wide">✕ Rechazar</button>
                    <button onClick={() => updateStatus(order.id, 'cooking')} className="bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg transition-all text-xs uppercase tracking-wide">🔥 A la plancha</button>
                  </div>
                )}
                {order.status === 'cooking' && (
                  <button onClick={() => updateStatus(order.id, 'ready')} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95">
                    <span>➡️</span> PASAR A EMPAQUE
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}