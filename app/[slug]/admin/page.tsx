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

  // --- ACTUALIZAR ESTADO (FLUJO SIMPLIFICADO) ---
  const updateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }

    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  if (!restaurant) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">👨‍🍳</div>
        <p className="text-xl text-gray-600 font-semibold">Cargando cocina...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50 p-4 relative">
      
      {/* ==========================================
          PANTALLA DE ACTIVACIÓN DE AUDIO
          ========================================== */}
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-black backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 shadow-2xl text-center max-w-md">
            <div className="text-7xl mb-6 animate-bounce">🔔</div>
            <h2 className="text-3xl font-black mb-3 tracking-tight">Activar Notificaciones</h2>
            <p className="text-gray-300 mb-8 text-sm">
              Escucharás un sonido cada vez que llegue un nuevo pedido
            </p>
            <button 
              onClick={enableAudio} 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 w-full"
            >
              🔊 INICIAR TURNO
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          HEADER PROFESIONAL DE COCINA
          ========================================== */}
      <div className="bg-white p-5 rounded-2xl shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-center border-l-4 border-orange-500 sticky top-4 z-10 gap-4 backdrop-blur-sm bg-white/95">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
            👨‍🍳
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <p className="text-gray-500 text-sm font-semibold">Cocina en Vivo</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = `/${slug}/admin/menu`}
            className="bg-white border-2 border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
          >
            📝 Gestionar Menú
          </button>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white px-5 py-2.5 rounded-xl font-black shadow-lg text-xl min-w-[60px] text-center">
            {orders.length}
          </div>
        </div>
      </div>

      {/* ==========================================
          ESTADO VACÍO MEJORADO
          ========================================== */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <div className="bg-white rounded-3xl p-12 shadow-xl text-center">
            <div className="text-8xl mb-6">🍳</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Todo tranquilo por aquí</h3>
            <p className="text-gray-500">Los pedidos aparecerán automáticamente</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all flex flex-col hover:shadow-2xl ${
                order.status === 'pending' 
                  ? 'border-gray-300 hover:border-gray-400' 
                  : 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-500'
              }`}
            >
              {/* ==========================================
                  CABECERA DE ORDEN
                  ========================================== */}
              <div className={`p-4 text-white flex justify-between items-center ${
                order.status === 'pending' 
                  ? 'bg-gradient-to-r from-gray-700 to-gray-800' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600'
              }`}>
                <div className="flex flex-col">
                  <span className="font-black text-2xl tracking-tight">{order.table_number}</span>
                  <span className="text-[11px] uppercase tracking-wider opacity-90 font-bold">
                    {order.status === 'pending' ? '⏳ Por Confirmar' : '🔥 En Plancha'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {formatTime(order.created_at)}
                  </div>
                </div>
              </div>

              {/* ==========================================
                  LISTA DE ITEMS MEJORADA
                  ========================================== */}
              <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-80">
                {groupItems(order.items).map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white w-9 h-9 flex items-center justify-center rounded-full font-black text-base shadow-md">
                        {item.quantity}
                      </div>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                        <div className="flex gap-1 mt-1">
                          {item.dough === 'maiz' && (
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-yellow-200">
                              🌽 MAÍZ
                            </span>
                          )}
                          {item.dough === 'arroz' && (
                            <span className="inline-block bg-white text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-300 shadow-sm">
                              🍚 ARROZ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ==========================================
                  ACCIONES SIMPLIFICADAS
                  ========================================== */}
              <div className="p-4 bg-gray-50 border-t-2 border-gray-100 space-y-2.5">
                
                {/* ESTADO: PENDIENTE */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={() => {
                        if(confirm('¿Rechazar este pedido?')) updateStatus(order.id, 'cancelled')
                      }}
                      className="bg-red-50 border-2 border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all text-sm active:scale-95"
                    >
                      ❌ Rechazar
                    </button>
                    <button 
                      onClick={() => {
                        updateStatus(order.id, 'cooking')
                      }}
                      className="bg-gradient-to-r from-gray-800 to-black text-white font-bold py-3 rounded-xl hover:from-gray-900 hover:to-gray-800 shadow-lg transition-all text-sm active:scale-95"
                    >
                      🔥 A LA PLANCHA
                    </button>
                  </div>
                )}

                {/* ESTADO: COCINANDO */}
                {order.status === 'cooking' && (
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={() => printTicket(order)}
                      className="w-full bg-white border-2 border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                    >
                      🖨️ Imprimir Ticket
                    </button>
                    
                    <button 
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 text-sm"
                    >
                      ✅ ENTREGAR Y ARCHIVAR
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