"use client"

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

  // --- AGRUPACIÓN DE ITEMS ---
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

  // --- ACTUALIZAR ESTADO ---
  const updateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    
    if (newStatus === 'delivered') {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl mb-4 animate-bounce">👨‍🍳</div>
        <p className="text-2xl text-gray-700 font-bold">Cargando cocina...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 p-4 relative">
      
      {/* ==========================================
          PANTALLA DE ACTIVACIÓN (MEJORADA)
          ========================================== */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-black backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 shadow-2xl text-center max-w-md">
            <div className="text-8xl mb-6 animate-bounce">🔔</div>
            <h2 className="text-4xl font-black mb-4 tracking-tight">Activar Notificaciones</h2>
            <p className="text-gray-300 mb-10 text-base leading-relaxed">
              Escucharás un sonido cada vez que llegue un nuevo pedido a la cocina
            </p>
            <button 
              onClick={enableAudio} 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-5 px-12 rounded-2xl text-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 w-full"
            >
              🔊 INICIAR TURNO
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          HEADER PREMIUM
          ========================================== */}
      <div className="bg-white rounded-2xl shadow-xl mb-6 sticky top-4 z-10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
        
        <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <p className="text-gray-600 text-sm font-semibold">Cocina en Vivo</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href={`/${slug}/admin/menu`}
              className="bg-white border-2 border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
            >
              📝 Gestionar Menú
            </a>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-xl font-black shadow-lg text-2xl min-w-[70px] text-center">
              {orders.length}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          ESTADO VACÍO (MEJORADO)
          ========================================== */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <div className="bg-white p-16 rounded-3xl shadow-2xl border-2 border-gray-100 text-center max-w-lg">
            <div className="text-9xl mb-6 opacity-40">🍳</div>
            <h3 className="text-3xl font-black text-gray-800 mb-3">Todo bajo control</h3>
            <p className="text-gray-500 text-lg">Los pedidos aparecerán aquí automáticamente</p>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="font-semibold">Sistema activo</span>
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================
            GRILLA DE ÓRDENES (MEJORADA)
            ========================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all flex flex-col hover:shadow-2xl hover:scale-[1.02] ${
                order.status === 'pending' 
                  ? 'border-gray-400' 
                  : 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
              }`}
            >
              {/* ==========================================
                  HEADER DE ORDEN
                  ========================================== */}
              <div className={`p-4 text-white flex justify-between items-center relative overflow-hidden ${
                 order.status === 'pending' 
                   ? 'bg-gradient-to-r from-gray-800 to-gray-900' 
                   : 'bg-gradient-to-r from-green-600 to-emerald-600'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10 flex flex-col">
                  <span className="font-black text-3xl tracking-tight">{order.table_number}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest opacity-90 flex items-center gap-1.5 mt-1">
                    {order.status === 'pending' ? (
                      <>
                        <span className="animate-pulse">⏳</span> POR CONFIRMAR
                      </>
                    ) : (
                      <>
                        <span className="animate-bounce">🔥</span> EN PLANCHA
                      </>
                    )}
                  </span>
                </div>
                
                <div className="relative z-10 text-right">
                  <div className="text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                    {formatTime(order.created_at)}
                  </div>
                  <div className="text-[10px] mt-1 opacity-75 font-semibold">
                    ${order.total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ==========================================
                  LISTA DE ITEMS (MEJORADA)
                  ========================================== */}
              <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-80">
                {groupItems(order.items).map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-base shadow-md ${
                      order.status === 'pending' 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
                    }`}>
                      {item.quantity}
                    </div>
                    
                    <div className="flex-1 leading-tight">
                      <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        {item.dough === 'maiz' && (
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-yellow-200 uppercase tracking-wide">
                            🌽 MAÍZ
                          </span>
                        )}
                        {item.dough === 'arroz' && (
                          <span className="inline-block bg-white text-gray-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-gray-300 uppercase tracking-wide shadow-sm">
                            🍚 ARROZ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ==========================================
                  FOOTER DE ACCIONES (MEJORADO)
                  ========================================== */}
              <div className="p-4 bg-gray-50 border-t-2 border-gray-100 space-y-2.5">
                
                {/* ESTADO: PENDIENTE */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={() => {
                        if(confirm('¿Rechazar este pedido?')) updateStatus(order.id, 'cancelled')
                      }}
                      className="bg-red-50 border-2 border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all text-xs uppercase tracking-wide active:scale-95"
                    >
                      ✕ Rechazar
                    </button>
                    <button 
                      onClick={() => updateStatus(order.id, 'cooking')}
                      className="bg-gradient-to-r from-gray-800 to-black text-white font-bold py-3 rounded-xl hover:from-gray-900 hover:to-gray-800 shadow-lg transition-all transform active:scale-95 text-xs uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      🔥 A la plancha
                    </button>
                  </div>
                )}

                {/* ESTADO: COCINANDO */}
                {order.status === 'cooking' && (
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={() => printTicket(order)}
                      className="w-full bg-white border-2 border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide active:scale-95"
                    >
                      🖨️ Imprimir Ticket
                    </button>
                    
                    <button 
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 transition-all transform active:scale-95 text-sm uppercase tracking-wide flex items-center justify-center gap-2"
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