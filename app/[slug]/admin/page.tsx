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
    
    // Creamos una ventanita invisible para imprimir
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
    // UI Optimista
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }

    // Base de datos
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
  }

  if (!restaurant) return <div className="p-10 text-center">Cargando cocina... 👨‍🍳</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-4 animate-bounce">👆</div>
          <h2 className="text-3xl font-bold mb-4">Activar Cocina</h2>
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
            <p className="text-gray-500 text-sm">Cocina en Vivo</p>
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
          <p className="text-xl">Olla limpia, corazón contento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all flex flex-col ${
                order.status === 'pending' ? 'border-gray-600' : // PENDIENTE = GRIS
                'border-green-500 bg-green-50' // COCINANDO = VERDE (Activo)
              }`}
            >
              {/* CABECERA */}
              <div className={`p-3 text-white flex justify-between items-center ${
                 order.status === 'pending' ? 'bg-gray-700' : 'bg-green-600'
              }`}>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl">{order.table_number}</span>
                  <span className="text-[10px] uppercase opacity-90">
                    {order.status === 'pending' ? 'Por Confirmar' : 'En Plancha'}
                  </span>
                </div>
                <span className="text-xs font-bold bg-black bg-opacity-20 px-2 py-1 rounded">
                  {formatTime(order.created_at)}
                </span>
              </div>

              {/* LISTA */}
              <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-80">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-white/50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="bg-white border-2 border-gray-200 text-gray-800 w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-lg shadow-sm">
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

              {/* ACCIONES SIMPLIFICADAS (2 TOQUES) */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
                
                {/* PASO 1: PENDIENTE -> ACEPTAR/COCINAR */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        if(confirm('¿Rechazar broma?')) updateStatus(order.id, 'cancelled')
                      }}
                      className="bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 text-sm"
                    >
                      ❌ Rechazar
                    </button>
                    <button 
                      onClick={() => {
                        updateStatus(order.id, 'cooking') // Pasa a cocinar
                        // printTicket(order) // Descomenta si quieres imprimir automático al aceptar
                      }}
                      className="bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg text-sm"
                    >
                      🔥 A LA PLANCHA
                    </button>
                  </div>
                )}

                {/* PASO 2: COCINANDO -> ENTREGAR (FIN) */}
                {order.status === 'cooking' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => printTicket(order)}
                      className="w-full bg-white border-2 border-gray-300 text-gray-700 font-bold py-2 rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2"
                    >
                      🖨️ Imprimir Ticket
                    </button>
                    
                    <button 
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95"
                    >
                      📦 ENTREGAR Y ARCHIVAR
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