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

  // --- AGRUPACIÓN DE ITEMS ---
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

  // --- SONIDO ---
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

  // --- FUNCIÓN DE IMPRESIÓN TÉRMICA (TICKET) 🖨️ ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const printTicket = (order: any) => {
    const items = groupItems(order.items)
    
    const printWindow = window.open('', '', 'width=300,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; font-size: 12px; margin: 0; padding: 5px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .title { font-size: 16px; font-weight: bold; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .qty { font-weight: bold; margin-right: 5px; }
            .total { border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; text-align: right; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${restaurant.name}</div>
            <div>Mesa: ${order.table_number}</div>
            <div>${new Date(order.created_at).toLocaleTimeString()}</div>
          </div>
          ${items.map((item: any) => `
            <div class="item">
              <div>
                <span class="qty">${item.quantity}x</span>
                ${item.name} <br/>
                <small>${item.dough ? item.dough.toUpperCase() : ''}</small>
              </div>
              <div>$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
          <div class="total">Total: $${order.total.toFixed(2)}</div>
          <br/><br/>.
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // --- CARGA DATOS ---
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
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
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

  // --- ACTUALIZAR ESTADO (AQUÍ ESTÁ LA MAGIA DE DESAPARECER) ---
  const updateStatus = async (orderId: string, newStatus: string) => {
    // 1. UI Optimista (Lo que ve el usuario)
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      // SI ES ENTREGADO O CANCELADO, LO BORRAMOS DE LA LISTA VISUAL INMEDIATAMENTE
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      // SI ES OTRO ESTADO (COCINANDO/LISTO), SOLO CAMBIAMOS EL COLOR
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }

    // 2. Base de datos (Lo que pasa por detrás)
    // Nota: Si es 'delivered', el cliente también necesita recibir 'ready' antes o simultáneo para sonar.
    // En el flujo de 2 toques: 
    // Toque 1: pending -> cooking
    // Toque 2: cooking -> ready (suena cliente) -> delivered (desaparece cocina)
    
    if (newStatus === 'delivered') {
        // Truco: Primero marcamos ready (para que suene el cliente) y 2 segs después delivered (para archivar)
        // Pero para la cocina, ya desapareció visualmente arriba.
        await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId)
        setTimeout(async () => {
            await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
        }, 2000)
    } else {
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  if (!restaurant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">👨‍🍳</div>
        <p className="text-xl text-gray-600 font-semibold">Cargando cocina...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative font-sans">
      
      {/* PANTALLA DE BLOQUEO DE AUDIO */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-6 animate-bounce">🔔</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Notificaciones</h2>
          <p className="text-gray-300 mb-8 text-sm max-w-xs text-center">
            Escucharás un sonido cada vez que llegue un nuevo pedido
          </p>
          <button 
            onClick={enableAudio} 
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform transform hover:scale-105 active:scale-95"
          >
            🔊 INICIAR TURNO
          </button>
        </div>
      )}

      {/* HEADER COCINA */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center border-l-8 border-orange-500 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-3xl">
            👨‍🍳
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <p className="text-gray-500 text-sm font-medium">Cocina en Vivo</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <a
            href={`/${slug}/admin/menu`}
            className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 hover:text-orange-600 transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            📝 Gestionar Menú
          </a>
          <div className="bg-orange-600 text-white px-5 py-2 rounded-xl font-black shadow-lg text-xl min-w-[60px] text-center">
            {orders.length}
          </div>
        </div>
      </div>

      {/* GRILLA DE PEDIDOS */}
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
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-2xl shadow-md overflow-hidden border-2 transition-all flex flex-col hover:shadow-xl ${
                order.status === 'pending' 
                  ? 'border-gray-800' 
                  : 'border-green-500' // Si está cooking es verde
              }`}
            >
              {/* CABECERA DE TARJETA */}
              <div className={`p-4 text-white flex justify-between items-center ${
                 order.status === 'pending' ? 'bg-gray-900' : 'bg-green-600'
              }`}>
                <div className="flex flex-col">
                  <span className="font-black text-2xl tracking-tighter">{order.table_number}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 flex items-center gap-1">
                    {order.status === 'pending' ? '⏳ POR CONFIRMAR' : '🔥 EN PLANCHA'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                    {formatTime(order.created_at)}
                  </div>
                </div>
              </div>

              {/* LISTA DE ITEMS */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 bg-gray-50/50">
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shadow-sm ${
                        order.status === 'pending' ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {item.quantity}
                      </span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        <div className="flex gap-1 mt-1">
                            {item.dough === 'maiz' && (
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 uppercase tracking-wide">
                                🌽 MAÍZ
                            </span>
                            )}
                            {item.dough === 'arroz' && (
                            <span className="inline-block bg-white text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide shadow-sm">
                                🍚 ARROZ
                            </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER ACCIONES */}
              <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                
                {/* ESTADO: PENDIENTE */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        if(confirm('¿Rechazar este pedido?')) updateStatus(order.id, 'cancelled')
                      }}
                      className="bg-red-50 border-2 border-red-100 text-red-500 font-bold py-3 rounded-xl hover:bg-red-100 hover:border-red-200 transition-all text-xs uppercase tracking-wide"
                    >
                      ✕ Rechazar
                    </button>
                    <button 
                      onClick={() => {
                        updateStatus(order.id, 'cooking')
                      }}
                      className="bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg transition-all transform active:scale-95 text-xs uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      🔥 A la plancha
                    </button>
                  </div>
                )}

                {/* ESTADO: COCINANDO (2 TOQUES) */}
                {order.status === 'cooking' && (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => printTicket(order)}
                      className="w-full bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                    >
                      🖨️ Imprimir Ticket
                    </button>
                    
                    {/* ESTE BOTÓN HACE 2 COSAS: 
                        1. Avisa al cliente (Ready) 
                        2. Desaparece de aquí (Delivered) - manejado en updateStatus 
                    */}
                    <button 
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 transition-all transform active:scale-95 text-xs uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      ✅ Entregar y Archivar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}