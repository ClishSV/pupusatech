"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'

const NOTIFICATION_SOUND = "/ding.mp3"

export default function KitchenPage() {
  const params = useParams()
  const slug = params?.slug as string

  // --- ESTADOS BASE ---
  const [orders, setOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // --- ESTADOS DE HISTORIAL Y CORTE ---
  const [showHistory, setShowHistory] = useState(false)
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // --- AYUDANTES ---
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

  // --- CARGAR DATOS EN VIVO ---
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
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restData.id}` },
          (payload) => {
            if (payload.new.status !== 'cancelled') {
              setOrders((prev) => [...prev, payload.new])
              playNotificationSound()
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    fetchInitialData()
  }, [slug])

  // --- ACTUALIZAR ESTADO (2 TOQUES) ---
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

  // --- CARGAR HISTORIAL DEL DÍA ---
  const loadHistory = async () => {
    setShowHistory(true)
    setLoadingHistory(true)
    
    // Obtener inicio y fin de hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false }) // Las más recientes primero

    if (data) setHistoryOrders(data)
    setLoadingHistory(false)
  }

  // --- CÁLCULOS DEL CORTE Z ---
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

  // --- IMPRESIÓN DE TICKETS ---
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
              <div><span class="qty">${item.quantity}x</span>${item.name} <br/><small>${item.dough ? item.dough.toUpperCase() : ''}</small></div>
              <div>$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
          <div class="total">Total: $${order.total.toFixed(2)}</div>
          <br/><br/>.
        </body>
      </html>
    `)
    printWindow.document.close(); printWindow.focus(); printWindow.print(); printWindow.close()
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
            <div>${restaurant.name}</div>
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
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Notificaciones</h2>
          <p className="text-gray-300 mb-8 text-sm max-w-xs text-center">Escucharás un sonido cada vez que llegue un nuevo pedido</p>
          <button onClick={enableAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform transform hover:scale-105 active:scale-95">
            🔊 INICIAR TURNO
          </button>
        </div>
      )}

      {/* HEADER COCINA */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center border-l-8 border-orange-500 sticky top-4 z-10 gap-4">
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
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* BOTÓN NUEVO: CORTE E HISTORIAL */}
          <button
            onClick={loadHistory}
            className="flex-1 sm:flex-none bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-all shadow-sm active:scale-95"
          >
            📊 Corte e Historial
          </button>
          
          <a
            href={`/${slug}/admin/menu`}
            className="flex-1 sm:flex-none bg-white border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all text-center shadow-sm active:scale-95"
          >
            📝 Menú
          </a>
        </div>
      </div>

      {/* GRILLA DE PEDIDOS ACTIVOS */}
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
                order.status === 'pending' ? 'border-gray-800' : 'border-green-500'
              }`}
            >
              <div className={`p-4 text-white flex justify-between items-center ${order.status === 'pending' ? 'bg-gray-900' : 'bg-green-600'}`}>
                <div className="flex flex-col">
                  <span className="font-black text-2xl tracking-tighter">{order.table_number}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{order.status === 'pending' ? '⏳ POR CONFIRMAR' : '🔥 EN PLANCHA'}</span>
                </div>
                <div className="text-right">
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
                  <div className="flex flex-col gap-3">
                    <button onClick={() => printTicket(order)} className="w-full bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide active:scale-95">
                      🖨️ Imprimir Ticket
                    </button>
                    <button onClick={() => updateStatus(order.id, 'delivered')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 transition-all transform active:scale-95 text-xs uppercase tracking-wide">
                      ✅ Entregar y Archivar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          MODAL DE CORTE DE CAJA E HISTORIAL
          ========================================== */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-left">
            
            {/* Header del Modal */}
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black">Corte del Día & Historial</h2>
                <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition">✕</button>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 font-bold animate-pulse">Calculando ventas...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
                
                {/* TARJETAS DE RESUMEN (CORTE Z) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                  <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4">Resumen de Ventas (Entregadas)</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl">
                      <p className="text-green-800 font-bold text-sm mb-1">Total en Caja</p>
                      <p className="text-3xl font-black text-green-700">${calculateCorte().totalSales.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
                      <p className="text-blue-800 font-bold text-sm mb-1">Órdenes Hoy</p>
                      <p className="text-3xl font-black text-blue-700">{calculateCorte().totalOrders}</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🫓 Pupusas:</span>
                      <span className="text-gray-900">${calculateCorte().totalPupusas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🥤 Bebidas:</span>
                      <span className="text-gray-900">${calculateCorte().totalBebidas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span>🍰 Extras/Otros:</span>
                      <span className="text-gray-900">${calculateCorte().totalOtros.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={printCorteZ}
                    className="w-full mt-6 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2"
                  >
                    🖨️ Imprimir Corte Z
                  </button>
                </div>

                {/* LISTA DE HISTORIAL */}
                <div>
                  <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4">Auditoría de Pedidos</h3>
                  
                  {historyOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-medium">Aún no hay pedidos terminados hoy.</div>
                  ) : (
                    <div className="space-y-4">
                      {historyOrders.map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                          <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                            <div>
                              <span className="font-black text-lg text-gray-900">{order.table_number}</span>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">{formatTime(order.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {order.status === 'delivered' ? '✅ Entregado' : '❌ Cancelado'}
                              </span>
                              <p className="font-black text-gray-900 mt-1">${order.total.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {groupItems(order.items).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600">
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