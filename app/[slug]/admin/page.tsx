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

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restData.id)
        .in('status', ['pending', 'cooking'])
        .order('created_at', { ascending: true })

      if (ordersData) setOrders(ordersData)

      // 💡 ESCUCHAR INSERCIONES Y ACTUALIZACIONES DEL MESERO
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

  // 💡 COCINA SOLO COCINA: pending -> cooking -> ready
  const updateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'ready' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId)) // Desaparece para ir a Despacho
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

  if (!restaurant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4 animate-bounce">👨‍🍳</div><p className="text-xl text-gray-600 font-semibold">Cargando cocina...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative font-sans">
      
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-6 animate-bounce">🔔</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Cocina</h2>
          <p className="text-gray-300 mb-8 text-sm max-w-xs text-center">Toca el botón para empezar a recibir pedidos con sonido.</p>
          <button onClick={enableAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform transform hover:scale-105 active:scale-95">
            🔊 INICIAR TURNO
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center border-l-8 border-orange-500 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-3xl">👨‍🍳</div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
              <p className="text-gray-500 text-sm font-medium">Cocina en Vivo</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-600 text-white px-5 py-2 rounded-xl font-black shadow-lg text-xl min-w-[60px] text-center">
          {orders.length}
        </div>
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
                    <div className="mt-2 inline-block bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded shadow-sm">
                      ⏱️ ENTREGAR: {targetTime}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">{formatTime(order.created_at)}</div>
                </div>
              </div>

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
                            {item.dough === 'maiz' && <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">🌽 MAÍZ</span>}
                            {item.dough === 'arroz' && <span className="inline-block bg-white text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-300 shadow-sm">🍚 ARROZ</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 💡 LA COCINA VUELVE A SU NATURALEZA (NO MÁS DELIVERY AQUÍ) */}
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