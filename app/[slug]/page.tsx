"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../lib/store' 

const NOTIFICATION_SOUND = "/ding.mp3"

export default function MenuPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menu, setMenu] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  
  // ESTADOS DE CHECKOUT Y DELIVERY 🛵
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderType, setOrderType] = useState<'local' | 'takeout' | 'delivery'>('local')
  
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCoords, setDeliveryCoords] = useState<{lat: number, lng: number} | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string>('pending') 
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  
  const { cart, addToCart, removeFromCart, total, clearCart } = useCartStore()

  // REGLA INTELIGENTE DE PUPUSAS
  const isPupusaItem = (item: any) => {
    if (!item) return false;
    const catName = (item.category || '').toLowerCase();
    const itemName = (item.name || '').toLowerCase();
    const pupusaKeywords = ['pupusa', 'tradicional', 'especial', 'mixta', 'internacional', 'loca', 'birria'];
    return pupusaKeywords.some(kw => catName.includes(kw) || itemName.includes(kw));
  }

  const getCategoryWeight = (category: string) => {
    const lower = String(category).toLowerCase();
    if (lower.includes('tradicional')) return 1;
    if (lower.includes('especial')) return 2;
    if (lower.includes('mixta')) return 3;
    if (lower.includes('internacional')) return 4;
    if (lower.includes('loca')) return 5;
    if (lower.includes('birria')) return 6;
    if (lower.includes('pupusa')) return 7;
    if (lower.includes('extra') || lower.includes('curtido')) return 8;
    if (lower.includes('bebida') || lower.includes('fresco') || lower.includes('soda')) return 9;
    if (lower.includes('postre') || lower.includes('dulce')) return 10;
    return 11; 
  }

  const renderItemImage = (item: any, sizeClasses = "w-20 h-20", textClass = "text-4xl") => {
    const hasPhoto = item?.image_url && (item.image_url.startsWith('/') || item.image_url.startsWith('http'));
    const initial = item?.name ? item.name.charAt(0).toUpperCase() : '🍽️';
    
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center shadow-md overflow-hidden relative border border-orange-100`}>
        {hasPhoto ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className={`${textClass} font-black text-orange-400`}>{initial}</span>
        )}
      </div>
    )
  }

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

  useEffect(() => {
    if (!activeOrderId) return
    if (!audioRef.current) audioRef.current = new Audio(NOTIFICATION_SOUND)

    const channel = supabase
      .channel(`tracking-${activeOrderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
        (payload) => {
          setOrderStatus(payload.new.status)
          if (payload.new.status === 'ready') {
            if (audioRef.current && audioUnlocked) {  
              audioRef.current.currentTime = 0
              audioRef.current.play().catch(err => console.warn("Audio bloqueado:", err))
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500])
          }
          if (payload.new.status === 'delivered' || payload.new.status === 'cancelled') {
            localStorage.removeItem('activeOrderId')
          }
        }
      ).subscribe()

    const handleVisibilityChange = () => { if (!document.hidden && audioRef.current) audioRef.current.load() }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeOrderId, audioUnlocked])

  const handleItemClick = (item: any) => { setSelectedItem(item); setCountMaiz(0); setCountArroz(0); setCountBebida(1); setShowModal(true) }
  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)

  const addBulkToCart = () => {
    if (!selectedItem) return
    if (isPupusaItem(selectedItem)) { 
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
  
  const increaseQuantity = (item: any) => addToCart({ cartId: crypto.randomUUID(), id: item.id, name: item.name, price: item.price, dough: item.dough })
  const decreaseQuantity = (item: any) => { const lastId = item.cartIds[item.cartIds.length - 1]; if (lastId) removeFromCart(lastId) }

  // 💡 NUEVO: OBTENER GPS
  const handleGetLocation = () => {
    setGettingLocation(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeliveryCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
          setGettingLocation(false)
        },
        () => {
          alert('Por favor permite el acceso al GPS o revisa la configuración de tu celular.')
          setGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      alert('Tu navegador no soporta ubicación.')
      setGettingLocation(false)
    }
  }

  const submitOrder = async () => {
    // Validaciones
    if (orderType !== 'delivery' && !customerName.trim()) { alert("Ingresa tu nombre o mesa"); return }
    if (orderType === 'delivery') {
      if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
        alert("Por favor llena todos los datos para el envío"); return;
      }
      if (!deliveryCoords) {
        alert("📍 Usa el botón para capturar tu ubicación GPS para el motorista."); return;
      }
    }
    
    if (audioRef.current && !audioUnlocked) {
      try {
        await audioRef.current.play(); audioRef.current.pause(); audioRef.current.currentTime = 0; setAudioUnlocked(true)
      } catch (err) { console.warn(err) }
    }

    setIsSubmitting(true)
    const { data, error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id, 
      table_number: customerName, 
      order_type: orderType, // Guardamos el tipo de orden
      customer_info: {       // Guardamos la info del cliente
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress,
        coords: deliveryCoords
      },
      status: 'pending', 
      total: total(), 
      items: cart
    }).select().single()

    setIsSubmitting(false)
    if (error) { console.error(error); alert("Error al enviar") } 
    else {
      setOrderStatus('pending') 
      clearCart(); setShowCheckout(false); setActiveOrderId(data.id); localStorage.setItem('activeOrderId', data.id)
    }
  }

  const totalItemsModal = isPupusaItem(selectedItem) ? countMaiz + countArroz : countBebida
  const totalPriceModal = selectedItem ? (totalItemsModal * selectedItem.price) : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="animate-bounce">🍽️ Cargando...</p></div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-red-500">No encontrado</div>

  const sortedCategories = Array.from(new Set(menu.map((item: any) => item.category)))
    .sort((a: any, b: any) => getCategoryWeight(a) - getCategoryWeight(b) || a.localeCompare(b));

  if (activeOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-1000 ${ orderStatus === 'ready' ? 'bg-green-50' : orderStatus === 'cooking' ? 'bg-orange-50' : 'bg-gray-100' }`}></div>
        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
          
          {orderStatus === 'pending' && (
            <><div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border-4 border-blue-100"><span className="text-4xl">📨</span></div><h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Enviada!</h2><p className="text-gray-500 mb-8 font-medium">Tu pedido fue recibido. <br/> Espera a que la cocina confirme.</p><div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="bg-blue-500 h-2 rounded-full w-1/3 animate-progress-indeterminate"></div></div></>
          )}
          {orderStatus === 'cooking' && (
            <><div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-200"><span className="text-4xl animate-bounce">🔥</span></div><h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Aceptada!</h2><p className="text-gray-500 mb-8">Estamos preparando tu pedido con amor.</p><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full w-2/3 transition-all duration-1000"></div></div></>
          )}
          {orderStatus === 'ready' && (
            <><div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-up border-4 border-green-200"><span className="text-4xl">✅</span></div><h2 className="text-2xl font-black text-gray-800 mb-2">¡Orden Lista!</h2><p className="text-gray-600 mb-8">Tu pedido está listo para entregar/recoger.</p><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full w-full"></div></div></>
          )}
          {(orderStatus === 'delivered' || orderStatus === 'cancelled') && (
             <div className="mt-4"><div className="text-5xl mb-4">👋</div><h3 className="text-xl font-bold text-gray-800 mb-2">Orden Finalizada</h3><p className="text-gray-500 mb-6 text-sm">Gracias por tu preferencia.</p><button onClick={() => { setActiveOrderId(null); localStorage.removeItem('activeOrderId') }} className="bg-gray-900 text-white font-bold py-3 px-6 rounded-xl w-full hover:bg-black transition shadow-lg">Hacer nuevo pedido</button></div>
          )}
        </div>
        {orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (<p className="relative z-10 mt-8 text-xs text-gray-400">ID Pedido: <span className="font-mono bg-white/50 px-2 py-1 rounded">{activeOrderId?.slice(0,8)}</span></p>)}
        <style jsx>{` @keyframes progress-indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } } .animate-progress-indeterminate { animation: progress-indeterminate 1.5s infinite linear; } `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32 relative">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" style={{ display: 'none' }} />

      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100">
        <div className="h-1 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500"></div>
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-4">
            {renderItemImage(restaurant, "w-16 h-16")}
            <div className="flex-1">
              <h1 className="font-black text-2xl text-gray-900 tracking-tight leading-tight mb-1.5">{restaurant.name}</h1>
              <div className="inline-flex items-center gap-1.5 bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow-sm"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span><span className="uppercase tracking-wide">Abierto Ahora</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-5 space-y-8">
        {sortedCategories.map(category => {
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category as string}>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-gray-200"></div></div>
                <div className="relative flex justify-center">
                  <span className="bg-gradient-to-b from-gray-50 to-white px-6 py-2 rounded-full border-2 border-gray-200 shadow-sm">
                    <h2 className="text-xl font-black text-gray-800 tracking-tight capitalize flex items-center gap-2">
                      {String(category).toLowerCase().includes('pupusa') || String(category).toLowerCase().includes('tradicional') || String(category).toLowerCase().includes('especial') || String(category).toLowerCase().includes('mixta') || String(category).toLowerCase().includes('loca') || String(category).toLowerCase().includes('birria') ? <><span className="text-2xl">🔥</span> {category as string}</> :
                       String(category).toLowerCase().includes('bebida') ? <><span className="text-2xl">🥤</span> {category as string}</> :
                       String(category).toLowerCase().includes('postre') ? <><span className="text-2xl">🍰</span> {category as string}</> :
                       <><span className="text-2xl">🍽️</span> {category as string}</>}
                    </h2>
                  </span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {items.map((item: any) => (
                  <div key={item.id} onClick={() => handleItemClick(item)} className="group relative bg-white p-5 rounded-3xl shadow-md border border-gray-100 flex items-center gap-5 cursor-pointer hover:shadow-2xl hover:border-orange-200 hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                    <div className="relative flex-shrink-0">
                      {renderItemImage(item, "w-20 h-20", "text-4xl")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1.5 group-hover:text-orange-600 transition-colors">{item.name}</h3>
                      <p className="text-gray-500 text-sm font-medium mb-2 line-clamp-1">{item.category}</p>
                      <span className="text-orange-600 font-black text-2xl">${item.price.toFixed(2)}</span>
                    </div>
                    <button className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-orange-400 group-hover:scale-110 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-scale-up overflow-hidden border-2 border-gray-100">
            <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 text-white overflow-hidden flex items-center gap-5">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              {renderItemImage(selectedItem, "w-20 h-20 shadow-xl border-4 border-white/30 z-10", "text-4xl text-orange-500")}
              <div className="relative z-10 flex-1">
                <h3 className="text-2xl font-black mb-1 leading-tight">{selectedItem.name}</h3>
                <p className="text-orange-100 font-medium">Personaliza tu orden</p>
              </div>
            </div>

            <div className="p-6">
              {isPupusaItem(selectedItem) ? (
                <div className="space-y-4 mb-6">
                  <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-3xl border-2 border-yellow-300 shadow-lg">
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">🌽</div>
                        <div><span className="font-black text-yellow-900 text-xl block">Maíz</span></div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-md">
                        <button onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} className="w-10 h-10 bg-white rounded-xl shadow-md text-xl font-bold text-gray-700 active:scale-95">−</button>
                        <span className="text-3xl font-black w-10 text-center text-yellow-900">{countMaiz}</span>
                        <button onClick={() => setCountMaiz(countMaiz + 1)} className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md text-xl font-bold text-white active:scale-95">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-3xl border-2 border-gray-300 shadow-lg">
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white border-2 border-gray-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg">🍚</div>
                        <div><span className="font-black text-gray-800 text-xl block">Arroz</span></div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-md">
                        <button onClick={() => setCountArroz(Math.max(0, countArroz - 1))} className="w-10 h-10 bg-white rounded-xl shadow-md text-xl font-bold text-gray-700 active:scale-95">−</button>
                        <span className="text-3xl font-black w-10 text-center text-gray-800">{countArroz}</span>
                        <button onClick={() => setCountArroz(countArroz + 1)} className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-md text-xl font-bold text-white active:scale-95">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-8 py-8">
                  <button onClick={() => setCountBebida(Math.max(1, countBebida - 1))} className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg text-3xl font-bold text-gray-700 active:scale-95">−</button>
                  <span className="text-6xl font-black w-20 text-center text-gray-800">{countBebida}</span>
                  <button onClick={() => setCountBebida(countBebida + 1)} className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg text-3xl font-bold text-white active:scale-95">+</button>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button onClick={addBulkToCart} disabled={totalItemsModal === 0} className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-black py-5 rounded-2xl text-lg shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-between px-6">
                  <span>Agregar al carrito</span>
                  {totalItemsModal > 0 && <span className="bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-base font-black">{totalItemsModal} × ${totalPriceModal.toFixed(2)}</span>}
                </button>
                <button onClick={() => setShowModal(false)} className="w-full text-gray-500 py-4 hover:text-gray-700 font-semibold transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODIFICADO PARA DELIVERY */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md shadow-2xl animate-slide-up overflow-hidden border-2 border-gray-100 h-[95vh] flex flex-col">
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white shrink-0">
              <div className="relative z-10 flex justify-between items-start">
                <div><h3 className="text-3xl font-black mb-1">Tu Orden</h3><p className="text-gray-300 font-medium">{cart.length} items en carrito</p></div>
                <button onClick={() => clearCart()} className="flex items-center gap-2 bg-white/10 hover:bg-red-500/80 backdrop-blur-sm px-4 py-2 rounded-xl transition-all font-bold text-sm shadow-lg"><span>🗑️</span></button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-gray-50 space-y-5">
              
              {/* SELECTOR DE TIPO DE ORDEN */}
              <div className="bg-white p-1.5 rounded-2xl flex shadow-sm border border-gray-200">
                <button 
                  onClick={() => setOrderType('local')} 
                  className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all ${orderType === 'local' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  🍽️ LOCAL
                </button>
                <button 
                  onClick={() => setOrderType('takeout')} 
                  className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all ${orderType === 'takeout' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  🛍️ LLEVAR
                </button>
                <button 
                  onClick={() => setOrderType('delivery')} 
                  className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all ${orderType === 'delivery' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  🛵 A DOMICILIO
                </button>
              </div>

              {/* LISTA DE ITEMS */}
              <div className="bg-white p-4 rounded-3xl space-y-3 border border-gray-100 shadow-sm">
                {getGroupedCart().map((group: any) => (
                  <div key={group.id + group.dough} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-gray-900 text-sm mb-1">{group.name}</span>
                      {group.dough && <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wide">🌽 {group.dough}</span>}
                      <span className="text-orange-600 font-black mt-1">${group.totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <button onClick={() => decreaseQuantity(group)} className="w-8 h-8 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">−</button>
                      <span className="w-8 text-center font-black text-sm bg-white">{group.quantity}</span>
                      <button onClick={() => increaseQuantity(group)} className="w-8 h-8 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-100">+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* FORMULARIOS DINÁMICOS SEGÚN EL TIPO DE ORDEN */}
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                
                {/* CAMPO COMÚN: NOMBRE */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    {orderType === 'local' ? '👤 Nombre o Número de Mesa' : '👤 Tu Nombre'}
                  </label>
                  <input type="text" placeholder={orderType === 'local' ? "Ej: Mesa 4 o Juan" : "Ej: Carlos López"} className="w-full border-2 border-gray-200 rounded-xl p-4 font-bold focus:border-orange-500 outline-none" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>

                {/* CAMPOS EXTRA PARA DELIVERY */}
                {orderType === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📞 Teléfono (WhatsApp)</label>
                      <input type="tel" placeholder="Ej: 7777-8888" className="w-full border-2 border-gray-200 rounded-xl p-4 font-bold focus:border-purple-500 outline-none" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🏠 Dirección Exacta y Referencia</label>
                      <textarea placeholder="Ej: Col. Escalón, Casa #4. Portón negro frente al parque." className="w-full border-2 border-gray-200 rounded-xl p-4 font-bold focus:border-purple-500 outline-none h-24 resize-none" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={handleGetLocation}
                        className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                          deliveryCoords ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
                        }`}
                      >
                        {gettingLocation ? '📍 Obteniendo GPS...' : 
                         deliveryCoords ? '✅ Ubicación Capturada' : 
                         '📍 Usar mi ubicación GPS (Obligatorio)'}
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
                        El motorista usará este GPS para llegar a ti con Waze/Maps.
                      </p>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* FOOTER DEL CHECKOUT */}
            <div className="p-5 bg-white border-t border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Subtotal:</span>
                <span className="text-gray-900 font-black text-3xl">${total().toFixed(2)}</span>
              </div>
              
              {orderType === 'delivery' && (
                <div className="bg-purple-50 p-3 rounded-xl mb-4 border border-purple-100 text-center">
                  <p className="text-xs text-purple-700 font-bold">🛵 El costo de envío se confirmará por WhatsApp.</p>
                </div>
              )}

              <button 
                onClick={submitOrder} 
                disabled={isSubmitting || cart.length === 0} 
                className={`w-full text-white font-black py-5 rounded-2xl text-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  orderType === 'delivery' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
                }`}
              >
                {isSubmitting ? 'Enviando...' : (orderType === 'delivery' ? '🛵 PEDIR A DOMICILIO' : '✅ CONFIRMAR ORDEN')}
              </button>
              
              <button onClick={() => setShowCheckout(false)} className="w-full text-gray-400 py-3 mt-2 font-bold hover:text-gray-600 transition-colors">Volver al Menú</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 animate-slide-up bg-gradient-to-t from-white via-white/80 to-transparent pt-10">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setShowCheckout(true)} className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center"><span className="font-black text-lg">{cart.length}</span></div>
                <span className="text-lg">🛒 Ver orden</span>
              </div>
              <span className="text-2xl font-black">${total().toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scale-up { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  )
}