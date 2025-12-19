"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../lib/store' 

// Sonido para el cliente cuando está listo
const NOTIFICATION_SOUND = "/ding.mp3"

export default function MenuPage() {
  const params = useParams()
  const slug = params?.slug as string

  // DATOS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [restaurant, setRestaurant] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [menu, setMenu] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ESTADOS DE INTERFAZ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  
  // ESTADOS DE CHECKOUT
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // ESTADOS DE TRACKING
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string>('pending') 
  
  // AUDIO REF & ESTADO
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  
  const { cart, addToCart, removeFromCart, total, clearCart } = useCartStore()

  // 1. CARGAR DATOS
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)

    async function fetchData() {
      if (!slug) return
      
      const savedOrderId = localStorage.getItem('activeOrderId')
      if (savedOrderId) {
        const { data: order } = await supabase.from('orders').select('status').eq('id', savedOrderId).single()
        if (order && order.status !== 'delivered' && order.status !== 'cancelled') {
          setActiveOrderId(savedOrderId)
          setOrderStatus(order.status)
        } else {
          localStorage.removeItem('activeOrderId')
        }
      }

      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) { setLoading(false); return }
      setRestaurant(restData)

      const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restData.id).eq('is_available', true)
      if (menuData) setMenu(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // 2. TRACKING EN TIEMPO REAL
  useEffect(() => {
    if (!activeOrderId) return

    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND)
    }

    console.log("📡 Rastreando pedido:", activeOrderId)

    const channel = supabase
      .channel(`tracking-${activeOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrderId}`
        },
        (payload) => {
          console.log("Cambio de estado:", payload.new.status)
          setOrderStatus(payload.new.status)
          
          if (payload.new.status === 'ready') {
            // Sonido
            if (audioRef.current && audioUnlocked) {  
              audioRef.current.currentTime = 0
              audioRef.current.play().catch(err => console.warn("🔇 Audio bloqueado:", err))
            }
            // Vibración
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500]); 
            }
          }

          if (payload.new.status === 'delivered' || payload.new.status === 'cancelled') {
            localStorage.removeItem('activeOrderId')
          }
        }
      )
      .subscribe()

    const handleVisibilityChange = () => {
      if (!document.hidden && audioRef.current) {
        audioRef.current.load()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeOrderId, audioUnlocked])


  // --- FUNCIONES CARRITO ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemClick = (item: any) => {
    setSelectedItem(item); setCountMaiz(0); setCountArroz(0); setCountBebida(1); setShowModal(true)
  }
  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)

  const addBulkToCart = () => {
    if (!selectedItem) return
    if (selectedItem.category === 'pupusas') {
      for (let i = 0; i < countMaiz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'maiz' })
      for (let i = 0; i < countArroz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'arroz' })
    } else {
      for (let i = 0; i < countBebida; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price })
    }
    setShowModal(false); setSelectedItem(null)
  }

  const getGroupedCart = () => {
    const grouped: Record<string, any> = {}
    cart.forEach(item => {
      const key = `${item.id}-${item.dough || ''}`
      if (grouped[key]) { grouped[key].quantity += 1; grouped[key].totalPrice += item.price; grouped[key].cartIds.push(item.cartId) }
      else { grouped[key] = { ...item, quantity: 1, totalPrice: item.price, cartIds: [item.cartId] } }
    })
    return Object.values(grouped)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const increaseQuantity = (item: any) => addToCart({ cartId: crypto.randomUUID(), id: item.id, name: item.name, price: item.price, dough: item.dough })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decreaseQuantity = (item: any) => { const lastId = item.cartIds[item.cartIds.length - 1]; if (lastId) removeFromCart(lastId) }

  // --- SUBMIT ---
  const submitOrder = async () => {
    if (!customerName.trim()) { alert("Nombre requerido"); return }
    
    // Desbloqueo de Audio
    if (audioRef.current && !audioUnlocked) {
      try {
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setAudioUnlocked(true)
      } catch (err) {
        console.warn("⚠️ Audio no desbloqueado:", err)
      }
    }

    setIsSubmitting(true)
    
    const { data, error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id,
      table_number: customerName,
      status: 'pending',
      total: total(),
      items: cart
    }).select().single()

    setIsSubmitting(false)
    if (error) { console.error(error); alert("Error al enviar") } 
    else {
      // ✅ CORRECCIÓN CLAVE: Reseteamos el estado a 'pending' MANUALMENTE aquí
      // para evitar que se muestre el estado anterior (delivered) por un segundo.
      setOrderStatus('pending') 
      
      clearCart(); 
      setShowCheckout(false); 
      setActiveOrderId(data.id); 
      localStorage.setItem('activeOrderId', data.id)
    }
  }

  const totalItemsModal = selectedItem?.category === 'pupusas' ? countMaiz + countArroz : countBebida
  const totalPriceModal = selectedItem ? (totalItemsModal * selectedItem.price) : 0

  // ================= RENDERIZADO =================

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="animate-bounce">🍽️ Cargando...</p></div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-red-500">No encontrado</div>

  // --- PANTALLA DE TRACKING ---
  if (activeOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-1000 ${
          orderStatus === 'ready' ? 'bg-green-50' : 
          orderStatus === 'cooking' ? 'bg-orange-50' : 'bg-gray-100'
        }`}></div>

        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
          
          {/* ESTATUS 1: PENDIENTE (DISEÑO MEJORADO) */}
          {orderStatus === 'pending' && (
            <>
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border-4 border-blue-100">
                <span className="text-4xl">📨</span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Enviada!</h2>
              <p className="text-gray-500 mb-8 font-medium">
                Tu pedido fue recibido. <br/> Espera a que la cocina confirme.
              </p>
              
              {/* Barra de progreso animada */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full w-1/3 animate-progress-indeterminate"></div>
              </div>
              <p className="text-xs text-blue-400 mt-3 font-bold uppercase tracking-wider">Esperando confirmación...</p>
            </>
          )}

          {/* ESTATUS 2: COCINANDO */}
          {orderStatus === 'cooking' && (
            <>
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-200">
                <span className="text-4xl animate-bounce">🔥</span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Aceptada!</h2>
              <p className="text-gray-500 mb-8">Tus pupusas ya están en la plancha. Relájate.</p>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full w-2/3 transition-all duration-1000"></div></div>
            </>
          )}

          {/* ESTATUS 3: LISTO */}
          {orderStatus === 'ready' && (
            <>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-up border-4 border-green-200">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Lista!</h2>
              <p className="text-gray-600 mb-8">Ya puedes pasar a recoger o esperar al mesero.</p>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full w-full"></div></div>
              <p className="mt-6 text-sm text-gray-400">¡Buen provecho!</p>
            </>
          )}

          {/* ESTATUS 4: FINALIZADO */}
          {(orderStatus === 'delivered' || orderStatus === 'cancelled') && (
             <div className="mt-4">
                <div className="text-5xl mb-4">👋</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Orden Finalizada</h3>
                <p className="text-gray-500 mb-6 text-sm">Gracias por tu visita.</p>
                <button 
                  onClick={() => {
                    setActiveOrderId(null)
                    localStorage.removeItem('activeOrderId')
                  }}
                  className="bg-gray-900 text-white font-bold py-3 px-6 rounded-xl w-full hover:bg-black transition shadow-lg"
                >
                  Hacer nuevo pedido
                </button>
             </div>
          )}
        </div>
        
        {orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (
           <p className="relative z-10 mt-8 text-xs text-gray-400">
             ID Pedido: <span className="font-mono bg-white/50 px-2 py-1 rounded">{activeOrderId?.slice(0,8)}</span>
           </p>
        )}

        <style jsx>{`
          @keyframes progress-indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
          .animate-progress-indeterminate {
            animation: progress-indeterminate 1.5s infinite linear;
          }
        `}</style>
      </div>
    )
  }

  // --- RENDER NORMAL ---
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl shadow-md flex items-center justify-center border-2 border-white ring-2 ring-gray-100 overflow-hidden">
               {restaurant.logo_url && restaurant.logo_url.startsWith('/') ? (
                  <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                  <span className="text-4xl">{restaurant.logo_url || '🍽️'}</span>
               )}
            </div>
            <div className="flex-1">
              <h1 className="font-black text-xl text-gray-900 tracking-tight leading-tight mb-1.5">{restaurant.name}</h1>
              <div className="inline-flex items-center gap-1.5 bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span className="uppercase tracking-wide">Abierto Ahora</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {['pupusas', 'extras', 'bebidas', 'postres'].map(category => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="text-xl font-extrabold text-gray-800 tracking-tight capitalize flex items-center gap-2">
                    {category === 'pupusas' && '🔥 Pupusas'}
                    {category === 'extras' && '✨ Extras'}
                    {category === 'bebidas' && '🥤 Bebidas'}
                    {category === 'postres' && '🍰 Postres'}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-transparent to-transparent"></div>
              </div>
              <div className="grid gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((item: any) => (
                  <div key={item.id} onClick={() => handleItemClick(item)} className="group bg-white p-4 rounded-2xl shadow-md border-2 border-gray-50 flex justify-between items-center cursor-pointer hover:shadow-xl hover:border-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 overflow-hidden relative">
                        {item.image_url && item.image_url.startsWith('/') ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-4xl">{item.image_url || '🥘'}</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-base leading-tight group-hover:text-orange-600 transition-colors">{item.name}</h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                            {item.category === 'pupusas' && '🌽 Del comal a tu mesa'}
                            {item.category === 'bebidas' && '❄️ Bebida refrescante'}
                            {item.category === 'extras' && '🌶️ El complemento perfecto'}
                            {item.category === 'postres' && '🍰 Un dulce final'}
                        </p>
                        <p className="text-orange-600 font-extrabold text-lg mt-1">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <button className="bg-orange-50 text-orange-600 w-11 h-11 rounded-full flex items-center justify-center shadow-sm border-2 border-orange-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 group-hover:shadow-lg transition-all duration-300">+</button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 text-8xl opacity-10">{selectedItem.category === 'pupusas' ? '🫓' : '🥤'}</div>
              <div className="relative z-10"><h3 className="text-2xl font-bold mb-1">{selectedItem.name}</h3><p className="text-orange-100 text-sm">Personaliza tu orden</p></div>
            </div>
            <div className="p-6">
              {selectedItem.category === 'pupusas' ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-xl shadow-md">🌽</div><div><span className="font-bold text-yellow-900 text-lg block">Maíz</span><span className="text-xs text-yellow-700">Tradicional</span></div></div>
                      <div className="flex items-center gap-3"><button onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} className="w-9 h-9 bg-white rounded-full shadow-md text-xl font-bold text-gray-600">−</button><span className="text-2xl font-bold w-8 text-center text-yellow-900">{countMaiz}</span><button onClick={() => setCountMaiz(countMaiz + 1)} className="w-9 h-9 bg-yellow-500 rounded-full shadow-md text-xl font-bold text-white">+</button></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xl shadow-md">🍚</div><div><span className="font-bold text-gray-800 text-lg block">Arroz</span><span className="text-xs text-gray-600">Sin gluten</span></div></div>
                      <div className="flex items-center gap-3"><button onClick={() => setCountArroz(Math.max(0, countArroz - 1))} className="w-9 h-9 bg-white rounded-full shadow-md text-xl font-bold text-gray-600">−</button><span className="text-2xl font-bold w-8 text-center text-gray-800">{countArroz}</span><button onClick={() => setCountArroz(countArroz + 1)} className="w-9 h-9 bg-gray-700 rounded-full shadow-md text-xl font-bold text-white">+</button></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-6 py-6">
                  <button onClick={() => setCountBebida(Math.max(1, countBebida - 1))} className="w-14 h-14 bg-gray-100 rounded-full shadow-lg text-3xl font-bold text-gray-600">−</button>
                  <span className="text-5xl font-bold w-16 text-center text-gray-800">{countBebida}</span>
                  <button onClick={() => setCountBebida(countBebida + 1)} className="w-14 h-14 bg-orange-500 rounded-full shadow-lg text-3xl font-bold text-white">+</button>
                </div>
              )}
              <div className="mt-6 space-y-3">
                <button onClick={addBulkToCart} disabled={totalItemsModal === 0} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"><span>Agregar al carrito</span>{totalItemsModal > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{totalItemsModal} × ${totalPriceModal.toFixed(2)}</span>}</button>
                <button onClick={() => setShowModal(false)} className="w-full text-gray-500 py-3 hover:text-gray-700 font-medium transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
              <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold">Tu Orden</h3><p className="text-orange-100 text-sm">{cart.length} items en carrito</p></div><button onClick={() => clearCart()} className="text-xs font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm">🗑️ Vaciar</button></div>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-2xl mb-5 max-h-64 overflow-y-auto space-y-3 border border-gray-200">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {getGroupedCart().map((group: any) => (
                  <div key={group.id + group.dough} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex flex-col flex-1"><span className="font-bold text-gray-900 text-base">{group.name}</span><span className="text-gray-500 text-xs uppercase font-semibold tracking-wide mt-0.5">{group.dough ? `🌽 ${group.dough}` : '🥤 Bebida'}</span><span className="text-orange-600 font-bold mt-1.5 text-sm">${group.totalPrice.toFixed(2)}</span></div>
                    <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden"><button onClick={() => decreaseQuantity(group)} className="w-9 h-9 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 active:bg-gray-200 transition">−</button><span className="w-10 text-center font-bold text-lg bg-white">{group.quantity}</span><button onClick={() => increaseQuantity(group)} className="w-9 h-9 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-50 active:bg-orange-100 transition">+</button></div>
                  </div>
                ))}
                {cart.length === 0 && <div className="text-center py-8"><div className="text-4xl mb-2">🛒</div><p className="text-gray-400 font-medium">Carrito vacío</p></div>}
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-2xl mb-5 border-2 border-orange-200"><div className="flex justify-between items-center"><span className="text-gray-700 font-semibold text-lg">Total a pagar:</span><span className="text-orange-600 font-extrabold text-3xl">${total().toFixed(2)}</span></div></div>
              <div className="mb-5"><label className="block text-sm font-bold text-gray-700 mb-2">📍 Identifícate</label><input type="text" placeholder="Ej: Mesa 4 o Juan Pérez" className="w-full border-2 border-gray-300 rounded-xl p-4 text-base focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
              <button onClick={submitOrder} disabled={isSubmitting || cart.length === 0} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3">{isSubmitting ? 'Enviando...' : '✅ Enviar a Cocina'}</button>
              <button onClick={() => setShowCheckout(false)} className="w-full text-gray-500 py-3 hover:text-gray-700 font-medium transition">← Seguir pidiendo</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE */}
      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 animate-slide-up">
          <div className="max-w-md mx-auto">
            <button onClick={() => setShowCheckout(true)} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-5 rounded-xl flex justify-between items-center shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><span className="font-extrabold text-base">{cart.length}</span></div><span className="text-base">🛒 Ver orden</span></div>
              <div className="flex items-center gap-1"><span className="text-xs text-orange-100">Total</span><span className="text-xl font-extrabold">${total().toFixed(2)}</span></div>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scale-up { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}