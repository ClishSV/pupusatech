"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../lib/store' 

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
  
  // AUDIO
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  
  const { cart, addToCart, removeFromCart, total, clearCart } = useCartStore()

  // Estados para modal
  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)

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

  // 2. TRACKING
  useEffect(() => {
    if (!activeOrderId) return
    if (!audioRef.current) audioRef.current = new Audio(NOTIFICATION_SOUND)

    const channel = supabase
      .channel(`tracking-${activeOrderId}`)
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrderId}`
        },
        (payload) => {
          setOrderStatus(payload.new.status)
          
          if (payload.new.status === 'ready') {
            if (audioRef.current && audioUnlocked) {  
              audioRef.current.currentTime = 0
              audioRef.current.play().catch(err => console.warn("Audio bloqueado:", err))
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([500, 200, 500, 200, 500])
            }
          }

          if (payload.new.status === 'delivered' || payload.new.status === 'cancelled') {
            localStorage.removeItem('activeOrderId')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeOrderId, audioUnlocked])

  // FUNCIONES CARRITO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setCountMaiz(0)
    setCountArroz(0)
    setCountBebida(1)
    setShowModal(true)
  }

  const addBulkToCart = () => {
    if (!selectedItem) return
    if (selectedItem.category === 'pupusas') {
      for (let i = 0; i < countMaiz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'maiz' })
      for (let i = 0; i < countArroz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'arroz' })
    } else {
      for (let i = 0; i < countBebida; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price })
    }
    setShowModal(false)
    setSelectedItem(null)
  }

  const getGroupedCart = () => {
    const grouped: Record<string, any> = {}
    cart.forEach(item => {
      const key = `${item.id}-${item.dough || ''}`
      if (grouped[key]) {
        grouped[key].quantity += 1
        grouped[key].totalPrice += item.price
        grouped[key].cartIds.push(item.cartId)
      } else {
        grouped[key] = { ...item, quantity: 1, totalPrice: item.price, cartIds: [item.cartId] }
      }
    })
    return Object.values(grouped)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const increaseQuantity = (item: any) => addToCart({ cartId: crypto.randomUUID(), id: item.id, name: item.name, price: item.price, dough: item.dough })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decreaseQuantity = (item: any) => { 
    const lastId = item.cartIds[item.cartIds.length - 1]
    if (lastId) removeFromCart(lastId)
  }

  // SUBMIT
  const submitOrder = async () => {
    if (!customerName.trim()) {
      alert("Nombre requerido")
      return
    }
    
    if (audioRef.current && !audioUnlocked) {
      try {
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setAudioUnlocked(true)
      } catch (err) {
        console.warn("Audio no desbloqueado:", err)
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
    
    if (error) {
      console.error(error)
      alert("Error al enviar")
    } else {
      setOrderStatus('pending')
      clearCart()
      setShowCheckout(false)
      setActiveOrderId(data.id)
      localStorage.setItem('activeOrderId', data.id)
    }
  }

  const totalItemsModal = selectedItem?.category === 'pupusas' ? countMaiz + countArroz : countBebida
  const totalPriceModal = selectedItem ? (totalItemsModal * selectedItem.price) : 0

  // ================= RENDERIZADO =================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
            <span className="text-4xl">🍽️</span>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Cargando menú...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-2xl">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-600 font-bold text-xl">Restaurante no encontrado</p>
        </div>
      </div>
    )
  }

  // --- PANTALLA DE TRACKING ---
  if (activeOrderId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Fondo animado con patrón */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className={`relative z-10 bg-white p-10 rounded-[2rem] shadow-2xl max-w-md w-full border-2 transition-all duration-500 ${
          orderStatus === 'ready' ? 'border-green-400' :
          orderStatus === 'cooking' ? 'border-orange-400' : 'border-gray-200'
        }`}>
          
          {orderStatus === 'pending' && (
            <>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full animate-ping opacity-20"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-4 border-blue-300 shadow-lg">
                  <span className="text-5xl">📨</span>
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3 text-center">¡Orden Enviada!</h2>
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Tu pedido fue recibido.<br className="hidden sm:block"/> 
                <span className="text-blue-600 font-semibold">Esperando confirmación</span> de la cocina...
              </p>
              
              <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 bg-[length:200%_100%] animate-shimmer" style={{width: '40%'}}></div>
              </div>
              
              <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </>
          )}

          {orderStatus === 'cooking' && (
            <>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-red-100 rounded-full animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center border-4 border-orange-300 shadow-lg">
                  <span className="text-5xl animate-bounce">🔥</span>
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3 text-center">¡Orden Aceptada!</h2>
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Tus pupusas ya están <span className="text-orange-600 font-semibold">en la plancha</span>.<br/>
                Relájate, no tardará mucho.
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-1000 shadow-lg" style={{width: '70%'}}></div>
              </div>
              
              <div className="mt-6 flex justify-center gap-3">
                <div className="px-4 py-2 bg-orange-100 rounded-full text-orange-700 text-sm font-bold">En preparación</div>
              </div>
            </>
          )}

          {orderStatus === 'ready' && (
            <>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full animate-ping"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center border-4 border-green-400 shadow-lg">
                  <span className="text-5xl">✅</span>
                </div>
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 text-center animate-pulse">
                ¡Orden Lista!
              </h2>
              <p className="text-gray-700 mb-6 text-center text-lg font-medium leading-relaxed">
                🎉 Ya puedes <span className="text-green-600 font-bold">pasar a recoger</span><br/>
                o esperar al mesero
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full shadow-lg" style={{width: '100%'}}></div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl">
                <p className="text-center text-green-800 font-bold text-sm">¡Buen provecho! 🍴</p>
              </div>
            </>
          )}

          {(orderStatus === 'delivered' || orderStatus === 'cancelled') && (
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">👋</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Orden Finalizada</h3>
              <p className="text-gray-500 mb-6">Gracias por tu visita</p>
              <button 
                onClick={() => {
                  setActiveOrderId(null)
                  localStorage.removeItem('activeOrderId')
                }}
                className="w-full bg-gradient-to-r from-gray-900 to-black text-white font-bold py-4 px-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
              >
                Hacer nuevo pedido
              </button>
            </div>
          )}
        </div>
        
        {orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (
          <div className="relative z-10 mt-6 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg">
            <p className="text-xs text-gray-500 font-mono">
              Pedido: <span className="font-bold text-gray-700">{activeOrderId?.slice(0,8).toUpperCase()}</span>
            </p>
          </div>
        )}
      </div>
    )
  }

  // --- RENDER NORMAL DEL MENÚ ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      
      {/* HEADER MEJORADO */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100">
        <div className="h-1 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500"></div>
        <div className="max-w-2xl mx-auto px-5 py-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl blur-md opacity-30"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-xl flex items-center justify-center border-2 border-white overflow-hidden">
                {restaurant.logo_url && restaurant.logo_url.startsWith('/') ? (
                  <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{restaurant.logo_url || '🍽️'}</span>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="font-black text-2xl text-gray-900 tracking-tight leading-tight mb-2">
                {restaurant.name}
              </h1>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="uppercase tracking-wider">Abierto Ahora</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MENÚ CON DISEÑO MEJORADO */}
      <div className="max-w-2xl mx-auto p-5 space-y-8">
        {['pupusas', 'extras', 'bebidas', 'postres'].map(category => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gradient-to-b from-gray-50 to-white px-6 py-2 rounded-full border-2 border-gray-200 shadow-sm">
                    <h2 className="text-xl font-black text-gray-800 tracking-tight capitalize flex items-center gap-2">
                      {category === 'pupusas' && <><span className="text-2xl">🔥</span> Pupusas</>}
                      {category === 'extras' && <><span className="text-2xl">✨</span> Extras</>}
                      {category === 'bebidas' && <><span className="text-2xl">🥤</span> Bebidas</>}
                      {category === 'postres' && <><span className="text-2xl">🍰</span> Postres</>}
                    </h2>
                  </span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="group relative bg-white p-5 rounded-3xl shadow-md border border-gray-100 flex items-center gap-5 cursor-pointer hover:shadow-2xl hover:border-orange-200 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                  >
                    {/* Imagen mejorada */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-red-200 rounded-2xl blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <div className="relative w-20 h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 overflow-hidden">
                        {item.image_url && item.image_url.startsWith('/') ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{item.image_url || '🥘'}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Info mejorada */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1.5 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium mb-2">
                        {item.category === 'pupusas' && '🌽 Del comal a tu mesa'}
                        {item.category === 'bebidas' && '❄️ Bebida refrescante'}
                        {item.category === 'extras' && '🌶️ El complemento perfecto'}
                        {item.category === 'postres' && '🍰 Un dulce final'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600 font-black text-2xl">${item.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Botón mejorado */}
                    <button className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-orange-400 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-2xl transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="M12 5v14"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL MEJORADO */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-scale-up overflow-hidden border-2 border-gray-100">
            {/* Header del modal */}
            <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="text-6xl mb-3 animate-bounce">
                  {selectedItem.category === 'pupusas' ? '🫓' : '🥤'}
                </div>
                <h3 className="text-3xl font-black mb-2">{selectedItem.name}</h3>
                <p className="text-orange-100 font-medium">Personaliza tu orden</p>
              </div>
            </div>

            <div className="p-6">
              {selectedItem.category === 'pupusas' ? (
                <div className="space-y-4">
                  {/* Maíz mejorado */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 p-5 rounded-3xl border-2 border-yellow-300 shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/30 rounded-full blur-2xl"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                          🌽
                        </div>
                        <div>
                          <span className="font-black text-yellow-900 text-xl block">Maíz</span>
                          <span className="text-xs text-yellow-700 font-semibold">Tradicional</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-md">
                        <button 
                          onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} 
                          className="w-10 h-10 bg-white rounded-xl shadow-md text-xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          −
                        </button>
                        <span className="text-3xl font-black w-10 text-center text-yellow-900">{countMaiz}</span>
                        <button 
                          onClick={() => setCountMaiz(countMaiz + 1)} 
                          className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md text-xl font-bold text-white hover:scale-105 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Arroz mejorado */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-5 rounded-3xl border-2 border-gray-300 shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-200/30 rounded-full blur-2xl"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white border-2 border-gray-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                          🍚
                        </div>
                        <div>
                          <span className="font-black text-gray-800 text-xl block">Arroz</span>
                          <span className="text-xs text-gray-600 font-semibold">Sabor único</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-md">
                        <button 
                          onClick={() => setCountArroz(Math.max(0, countArroz - 1))} 
                          className="w-10 h-10 bg-white rounded-xl shadow-md text-xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          −
                        </button>
                        <span className="text-3xl font-black w-10 text-center text-gray-800">{countArroz}</span>
                        <button 
                          onClick={() => setCountArroz(countArroz + 1)} 
                          className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-md text-xl font-bold text-white hover:scale-105 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-8 py-8">
                  <button 
                    onClick={() => setCountBebida(Math.max(1, countBebida - 1))} 
                    className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg text-3xl font-bold text-gray-700 hover:scale-110 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <span className="text-6xl font-black w-20 text-center text-gray-800">{countBebida}</span>
                  <button 
                    onClick={() => setCountBebida(countBebida + 1)} 
                    className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg text-3xl font-bold text-white hover:scale-110 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button 
                  onClick={addBulkToCart}
                  disabled={totalItemsModal === 0}
                  className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-black py-5 rounded-2xl text-lg shadow-2xl hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-between px-6"
                >
                  <span>Agregar al carrito</span>
                  {totalItemsModal > 0 && (
                    <span className="bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-base font-black">
                      {totalItemsModal} × ${totalPriceModal.toFixed(2)}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="w-full text-gray-500 py-4 hover:text-gray-700 font-semibold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MEJORADO */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md shadow-2xl animate-slide-up overflow-hidden border-2 border-gray-100">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-6 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black mb-1">Tu Orden</h3>
                  <p className="text-orange-100 font-medium">{cart.length} items en carrito</p>
                </div>
                <button 
                  onClick={() => clearCart()} 
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105 active:scale-95"
                >
                  <span>🗑️</span>
                  <span>Vaciar</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Lista de items */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-3xl mb-5 max-h-72 overflow-y-auto space-y-3 border-2 border-gray-200">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {getGroupedCart().map((group: any) => (
                  <div key={group.id + group.dough} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-md border border-gray-100">
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-gray-900 text-base mb-1">{group.name}</span>
                      <span className="text-gray-500 text-xs uppercase font-bold tracking-wide">
                        {group.dough ? `🌽 ${group.dough}` : '🥤 Bebida'}
                      </span>
                      <span className="text-orange-600 font-black mt-2 text-lg">${group.totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <button 
                        onClick={() => decreaseQuantity(group)} 
                        className="w-10 h-10 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 active:bg-gray-200 transition-all"
                      >
                        −
                      </button>
                      <span className="w-12 text-center font-black text-xl bg-white">{group.quantity}</span>
                      <button 
                        onClick={() => increaseQuantity(group)} 
                        className="w-10 h-10 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-50 active:bg-orange-100 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="text-gray-400 font-semibold">Carrito vacío</p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-5 rounded-3xl mb-5 border-2 border-orange-200 shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl"></div>
                <div className="relative flex justify-between items-center">
                  <span className="text-gray-700 font-bold text-xl">Total a pagar:</span>
                  <span className="text-orange-600 font-black text-4xl">${total().toFixed(2)}</span>
                </div>
              </div>

              {/* Input nombre */}
              <div className="mb-5">
                <label className="flex items-center gap-2 text-sm font-black text-gray-700 mb-3">
                  <span className="text-lg">📍</span>
                  <span>Identifícate</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Mesa 4 o Juan Pérez" 
                  className="w-full border-2 border-gray-300 rounded-2xl p-5 text-base font-medium focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                />
              </div>

              {/* Botones */}
              <button 
                onClick={submitOrder} 
                disabled={isSubmitting || cart.length === 0} 
                className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-black py-5 rounded-2xl text-lg shadow-2xl hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Enviar a Cocina</span>
                  </>
                )}
              </button>
              
              <button 
                onClick={() => setShowCheckout(false)} 
                className="w-full text-gray-500 py-4 hover:text-gray-700 font-semibold transition-colors"
              >
                ← Seguir pidiendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE MEJORADO */}
      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 animate-slide-up">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => setShowCheckout(true)} 
              className="relative w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-black py-4 px-6 rounded-2xl flex justify-between items-center shadow-2xl hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></div>
              
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                  <span className="font-black text-lg">{cart.length}</span>
                </div>
                <span className="text-lg">🛒 Ver orden completa</span>
              </div>
              
              <div className="relative flex flex-col items-end">
                <span className="text-xs text-orange-100 font-bold uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black">${total().toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up { 
          animation: scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
        }
        
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { 
          animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { 
          animation: fade-in 0.3s ease-out; 
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        /* Scrollbar personalizado */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #f97316, #ef4444);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #ea580c, #dc2626);
        }
      `}</style>
    </div>
  )
}