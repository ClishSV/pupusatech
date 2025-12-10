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
  
  // ESTADO NUEVO: Para saber si ya tenemos permiso de audio
  const [audioEnabled, setAudioEnabled] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // --- 1. FUNCIÓN DE AGRUPACIÓN ---
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

  // --- 2. SISTEMA DE AUDIO MEJORADO ---
  const playNotificationSound = () => {
    if (!audioRef.current) return

    // Reiniciamos el audio al segundo 0 para que suene aunque ya esté sonando
    audioRef.current.currentTime = 0
    
    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("🔊 Bloqueo de navegador detectado:", error)
        // Si falla, es porque perdimos el permiso, desactivamos el estado
        setAudioEnabled(false) 
      })
    }
  }

  // Función para activar el audio manualmente (El clic mágico)
  const enableAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND)
    }
    // Reproducimos un silencio o el sonido bajito para "desbloquear"
    audioRef.current.play().then(() => {
      audioRef.current?.pause()
      audioRef.current!.currentTime = 0
      setAudioEnabled(true)
    }).catch(e => console.error(e))
  }

  // --- 3. CARGA DE DATOS ---
  useEffect(() => {
    // Inicializamos el objeto de audio al cargar
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
        .neq('status', 'delivered')
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
            setOrders((prev) => [...prev, payload.new])
            // Solo suena si ya habilitamos el audio
            playNotificationSound()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    fetchInitialData()
  }, [slug])

  // --- 4. ACTUALIZAR ESTADOS ---
  const updateStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)

    if (newStatus === 'delivered') {
      setTimeout(() => {
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }, 2000)
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  if (!restaurant) return <div className="p-10 text-center">Cargando cocina... 👨‍🍳</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      
      {/* --- PANTALLA DE BLOQUEO (SI NO HAY AUDIO) --- */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-4 animate-bounce">👆</div>
          <h2 className="text-3xl font-bold mb-4 text-center">Cocina Pausada</h2>
          <p className="mb-8 text-gray-300 text-center max-w-md">
            Por reglas del navegador, necesitas activar el sonido manualmente para recibir alertas de pedidos.
          </p>
          <button 
            onClick={enableAudio}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transform transition hover:scale-105"
          >
            🔊 INICIAR TURNO
          </button>
        </div>
      )}

     {/* HEADER COCINA */}
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
            {/* BOTÓN NUEVO: IR AL MENÚ */}
            <a 
              href={`/${slug}/admin/menu`}
              className="bg-white border-2 border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2 text-sm shadow-sm"
            >
              📝 Editar Menú
            </a>

            <button 
                onClick={playNotificationSound}
                className="text-xs bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
            >
                🔊 Audio
            </button>
            <div className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg text-xl">
              {orders.length}
            </div>
        </div>
      </div>

      {/* GRILLA DE PEDIDOS */}
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
                order.status === 'pending' ? 'border-red-500 animate-pulse-slow' : 
                order.status === 'cooking' ? 'border-yellow-400' : 
                'border-green-500 bg-green-50'
              }`}
            >
              {/* CABECERA */}
              <div className={`p-3 text-white flex justify-between items-center ${
                 order.status === 'pending' ? 'bg-red-500' : 
                 order.status === 'cooking' ? 'bg-yellow-500' : 
                 'bg-green-500'
              }`}>
                <span className="font-extrabold text-xl">{order.table_number}</span>
                <span className="text-xs font-bold bg-black bg-opacity-20 px-2 py-1 rounded">
                  {formatTime(order.created_at)}
                </span>
              </div>

              {/* LISTA CONSOLIDADA */}
              <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-80">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="bg-white border-2 border-gray-200 text-gray-700 w-10 h-10 flex items-center justify-center rounded-full font-extrabold text-lg shadow-sm">
                        {item.quantity}
                      </span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-base">{item.name}</p>
                        {item.dough === 'maiz' && (
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded border border-yellow-200 mt-1">
                            🌽 MAÍZ
                          </span>
                        )}
                        {item.dough === 'arroz' && (
                          <span className="inline-block bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded border border-gray-300 mt-1 shadow-sm">
                            🍚 ARROZ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER */}
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between font-bold text-gray-600 mb-3 text-sm px-1">
                  <span>Total Orden:</span>
                  <span className="text-black text-base">${order.total.toFixed(2)}</span>
                </div>

                {order.status === 'pending' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'cooking')}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95"
                  >
                    🔥 COCINAR
                  </button>
                )}

                {order.status === 'cooking' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'ready')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95"
                  >
                    🛎️ LISTO PARA LLEVAR
                  </button>
                )}

                {order.status === 'ready' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl shadow transition"
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