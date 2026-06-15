"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'

const NOTIFICATION_SOUND = "/ding.mp3"

export default function DespachoPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [orders, setOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({})

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

  // --- IMPRESIÓN ---
  const printTicket = (order: any) => {
    const items = groupItems(order.items)
    const shortCode = order.id.slice(0,4).toUpperCase()
    const fee = order.customer_info?.delivery_fee || 0
    const printWindow = window.open('', '', 'width=300,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; font-size: 12px; margin: 0; padding: 5px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .title { font-size: 16px; font-weight: bold; }
            .code { font-size: 20px; font-weight: black; margin: 5px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .qty { font-weight: bold; margin-right: 5px; }
            .total { border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; text-align: right; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${restaurant.name}</div>
            <div class="code">ORDEN #${shortCode}</div>
            <div>Mesa/Cliente: ${order.table_number}</div>
            <div>${new Date(order.created_at).toLocaleTimeString()}</div>
          </div>
          ${items.map((item: any) => `
            <div class="item">
              <div><span class="qty">${item.quantity}x</span>${item.name} <br/><small>${item.dough ? item.dough.toUpperCase() : ''}</small></div>
              <div>$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
          ${fee > 0 ? `
            <div class="item" style="margin-top: 5px;">
              <div>Tarifa de Envío</div>
              <div>$${fee.toFixed(2)}</div>
            </div>
          ` : ''}
          <div class="total">Total a Pagar: $${order.total.toFixed(2)}</div>
          <br/><br/><br/><div style="text-align:center;">---</div>
        </body>
      </html>
    `)
    printWindow.document.close(); printWindow.focus(); printWindow.print(); printWindow.close()
  }

  // --- LÓGICA DE TARIFAS Y WHATSAPP DOBLE ---
  const saveDeliveryFee = async (order: any) => {
    const feeStr = deliveryFees[order.id];
    if (!feeStr || isNaN(Number(feeStr))) return alert('Ingresa una tarifa válida en números.');
    
    const fee = parseFloat(feeStr);
    const newTotal = order.total + fee;
    const newCustomerInfo = { ...order.customer_info, delivery_fee: fee };

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, total: newTotal, customer_info: newCustomerInfo } : o));

    await supabase.from('orders').update({
      total: newTotal,
      customer_info: newCustomerInfo
    }).eq('id', order.id);
  }

  const notifyClient = (order: any) => {
    const info = order.customer_info || {};
    const fee = info.delivery_fee || 0;
    const subtotal = order.total - fee;
    
    const text = `¡Hola ${info.name || ''}! 👋\n\nTu pedido de *${restaurant.name}* ya está empacado y va en camino 🛵🔥.\n\n` +
                 `🧾 *Desglose de tu Orden:*\n` +
                 `• Comida: $${subtotal.toFixed(2)}\n` +
                 `• Tarifa de Envío: $${fee.toFixed(2)}\n` +
                 `*TOTAL A PAGAR: $${order.total.toFixed(2)}*\n\n` +
                 `¡Gracias por preferirnos, buen provecho! 🫓`;
    
    const phone = info.phone ? info.phone.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone ? '503'+phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const sendToDriver = (order: any) => {
    const info = order.customer_info || {};
    const shortCode = order.id.slice(0,4).toUpperCase();
    const coordsStr = info.coords ? `${info.coords.lat},${info.coords.lng}` : '';
    
    const text = `🛵 *NUEVO VIAJE - ORDEN #${shortCode}* 🛵\n\n` +
                 `👤 *Cliente:* ${info.name || order.table_number}\n` +
                 `📞 *Teléfono:* ${info.phone || 'No provisto'}\n` +
                 `💰 *TOTAL A COBRAR: $${order.total.toFixed(2)}*\n\n` +
                 `🏠 *Referencia:* ${info.address || 'No provista'}\n` +
                 (coordsStr ? `📍 *Ubicación GPS:* https://waze.com/ul?ll=${coordsStr}&navigate=yes` : '');
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  // --- CARGAR DATOS (SOLO READY) ---
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)

    async function fetchInitialData() {
      if (!slug) return
      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      const { data: ordersData } = await supabase.from('orders').select('*')
        .eq('restaurant_id', restData.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: true })

      if (ordersData) setOrders(ordersData)

      const channel = supabase.channel('despacho-orders')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restData.id}` },
          (payload) => {
            if (payload.new.status === 'ready') {
              setOrders((prev) => {
                if (!prev.find(o => o.id === payload.new.id)) return [...prev, payload.new]
                return prev
              })
              playNotificationSound() 
            }
          }
        ).subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    fetchInitialData()
  }, [slug])

  // --- FINALIZAR Y COBRAR ---
  const deliverOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId))
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
  }

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })

  if (!restaurant) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">Cargando despacho...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative font-sans">
      
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="text-6xl mb-6 animate-bounce">🛍️</div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Activar Despacho</h2>
          <button onClick={enableAudio} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-2xl transition-transform active:scale-95">🔊 INICIAR CAJA</button>
        </div>
      )}

      {/* HEADER DESPACHO */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center border-l-8 border-blue-500 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">🛍️</div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{restaurant.name}</h1>
            <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
               <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Estación de Empaque y Caja
            </p>
          </div>
        </div>
        <div className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black shadow-lg text-xl">{orders.length}</div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 text-center">
            <div className="text-7xl mb-4 opacity-50">📦</div>
            <h3 className="text-xl font-bold text-gray-600 mb-1">Sin órdenes listas</h3>
            <p className="text-sm text-gray-400">La cocina todavía está trabajando...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const isDelivery = order.order_type === 'delivery';
            const isTakeout = order.order_type === 'takeout';
            const customerInfo = order.customer_info || {};
            
            const deliveryFee = customerInfo.delivery_fee;
            const hasFee = deliveryFee !== undefined && deliveryFee !== null;

            return (
            <div key={order.id} className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-blue-400 flex flex-col">
              
              <div className="bg-blue-600 p-4 text-white flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tight leading-tight flex items-center gap-2">
                    {isDelivery ? `🛵 Domicilio` : isTakeout ? `🛍️ Llevar` : order.table_number}
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">#{order.id.slice(0,4).toUpperCase()}</span>
                  </span>
                  {(isDelivery || isTakeout) && (
                    <span className="text-sm font-bold text-white/90 mt-1">👤 {customerInfo.name || order.table_number}</span>
                  )}
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-2">LISTO PARA EMPAQUE</span>
                </div>
                <div className="text-xs font-bold bg-black/20 px-2 py-1 rounded">{formatTime(order.created_at)}</div>
              </div>

              {/* LISTA DE ITEMS */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 bg-gray-50/50">
                {groupItems(order.items).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full font-black text-sm bg-blue-100 text-blue-700">{item.quantity}</span>
                      <div className="leading-tight">
                        <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        {item.dough && <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 uppercase">{item.dough}</span>}
                      </div>
                    </div>
                    <span className="font-bold text-gray-600 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* GESTIÓN DE TARIFA Y TOTAL A COBRAR */}
              <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                
                {/* 💡 NUEVO: VER DIRECCIÓN Y GPS ANTES DE COBRAR */}
                {isDelivery && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm shadow-sm">
                    {customerInfo.phone && (
                       <p className="font-bold text-gray-700 flex items-center gap-2 mb-2">
                         <span>📞</span> <span>{customerInfo.phone}</span>
                       </p>
                    )}
                    <p className="font-bold text-gray-700 flex items-start gap-2 leading-tight">
                      <span>🏠</span> <span>{customerInfo.address || 'Sin dirección escrita'}</span>
                    </p>
                    {customerInfo.coords && (
                      <button 
                        onClick={() => window.open(`https://waze.com/ul?ll=${customerInfo.coords.lat},${customerInfo.coords.lng}&navigate=yes`, '_blank')}
                        className="mt-3 w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs shadow-sm active:scale-95"
                      >
                        📍 Abrir GPS para calcular tarifa
                      </button>
                    )}
                  </div>
                )}

                {/* SI ES DELIVERY Y AÚN NO TIENE TARIFA */}
                {isDelivery && !hasFee && (
                  <div className="bg-purple-50 p-3 rounded-xl border-2 border-purple-200 flex gap-3 items-center shadow-inner">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-purple-800 uppercase tracking-wide block mb-1">Fijar Envío ($)</label>
                      <input 
                        type="number" step="0.25" placeholder="Ej: 2.50" 
                        className="w-full p-2.5 rounded-lg font-black text-gray-900 outline-none border border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200" 
                        value={deliveryFees[order.id] || ''} 
                        onChange={e => setDeliveryFees({...deliveryFees, [order.id]: e.target.value})} 
                      />
                    </div>
                    <button 
                      onClick={() => saveDeliveryFee(order)} 
                      className="bg-purple-600 text-white font-black py-2.5 px-4 rounded-lg mt-5 text-sm hover:bg-purple-700 shadow-md active:scale-95"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {/* SI TIENE TARIFA, MOSTRAR DESGLOSE */}
                {isDelivery && hasFee && (
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Comida:</span>
                      <span>${(order.total - deliveryFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-purple-700">
                      <span>Tarifa de Envío:</span>
                      <span>+ ${deliveryFee.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* TOTAL FINAL SIEMPRE VISIBLE */}
                <div className="flex justify-between items-center bg-gray-100 p-3 rounded-xl">
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">A Cobrar:</span>
                    <span className="font-black text-3xl text-gray-900">${order.total.toFixed(2)}</span>
                </div>

                {/* BOTONES DE COMUNICACIÓN DELIVERY */}
                {isDelivery && hasFee && (
                  <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                    <button onClick={() => notifyClient(order)} className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
                      📲 Avisar a Cliente (Total)
                    </button>
                    <button onClick={() => sendToDriver(order)} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
                      🛵 WhatsApp a Motorista
                    </button>
                  </div>
                )}

                {/* ACCIONES FINALES */}
                <div className="flex gap-2">
                  <button onClick={() => printTicket(order)} className="w-14 bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center text-lg active:scale-95">
                    🖨️
                  </button>
                  <button onClick={() => deliverOrder(order.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95">
                    ✅ ENTREGAR
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}