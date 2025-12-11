"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../lib/store' 

export default function MenuPage() {
  const params = useParams()
  const slug = params?.slug as string

  // DATOS
  const [restaurant, setRestaurant] = useState<any>(null)
  const [menu, setMenu] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ESTADOS DE INTERFAZ
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  
  // ESTADOS PARA CANTIDADES (MODAL)
  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)
  
  // ESTADOS DE CHECKOUT
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  
  const { cart, addToCart, removeFromCart, total, clearCart } = useCartStore()

  useEffect(() => {
    async function fetchData() {
      if (!slug) return
      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) { setLoading(false); return }
      setRestaurant(restData)

      const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restData.id).eq('is_available', true)
      if (menuData) setMenu(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

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
      for (let i = 0; i < countMaiz; i++) {
        addToCart({
          cartId: crypto.randomUUID(),
          id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          dough: 'maiz'
        })
      }
      for (let i = 0; i < countArroz; i++) {
        addToCart({
          cartId: crypto.randomUUID(),
          id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          dough: 'arroz'
        })
      }
    } else {
      for (let i = 0; i < countBebida; i++) {
        addToCart({
          cartId: crypto.randomUUID(),
          id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price
        })
      }
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
        grouped[key] = {
          ...item,
          quantity: 1,
          totalPrice: item.price,
          cartIds: [item.cartId]
        }
      }
    })
    return Object.values(grouped)
  }

  const increaseQuantity = (item: any) => {
    addToCart({
      cartId: crypto.randomUUID(),
      id: item.id,
      name: item.name,
      price: item.price,
      dough: item.dough
    })
  }

  const decreaseQuantity = (item: any) => {
    const lastId = item.cartIds[item.cartIds.length - 1]
    if (lastId) removeFromCart(lastId)
  }

  const submitOrder = async () => {
    if (!customerName.trim()) {
      alert("Por favor escribe tu nombre o número de mesa")
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id,
      table_number: customerName,
      status: 'pending',
      total: total(),
      items: cart
    })
    setIsSubmitting(false)
    if (error) {
      console.error(error)
      alert("Error al enviar")
    } else {
      setOrderSuccess(true)
      clearCart()
      setShowCheckout(false)
    }
  }

  const totalItemsModal = selectedItem?.category === 'pupusas' 
    ? countMaiz + countArroz 
    : countBebida
  
  const totalPriceModal = selectedItem ? (totalItemsModal * selectedItem.price) : 0

  // ==========================================
  // MEJORAS UX/UI: ESTADOS DE CARGA Y ERROR
  // ==========================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4 animate-bounce">🍽️</div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-progress"></div>
          </div>
          <p className="text-gray-500 font-medium">Cargando menú delicioso...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Restaurante no encontrado</h2>
          <p className="text-gray-500 mb-6">Verifica el código QR o contacta al establecimiento</p>
          <button onClick={() => window.location.reload()} className="bg-orange-500 text-white font-bold py-3 px-6 rounded-xl w-full hover:bg-orange-600 transition">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden">
          {/* Confetti animado */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-4 left-4 text-2xl animate-bounce">🎉</div>
            <div className="absolute top-6 right-6 text-xl animate-bounce delay-100">✨</div>
            <div className="absolute bottom-8 left-8 text-lg animate-bounce delay-200">🎊</div>
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-up">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido Enviado!</h2>
            <p className="text-gray-600 mb-6">Tu orden ya está en cocina preparándose con amor 🔥</p>
            <button 
              onClick={() => setOrderSuccess(false)} 
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl w-full hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
            >
              Ordenar más
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ==========================================
          HEADER LIMPIO Y PROFESIONAL
          ========================================== */}
      <div className="sticky top-0 z-20 bg-white shadow-lg">
        {/* Barra superior con gradiente sutil */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
        
        {/* Contenedor principal del header */}
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl shadow-md flex items-center justify-center text-5xl border-2 border-white ring-2 ring-gray-100">
              {restaurant.logo_url || '🍽️'}
            </div>
            
            {/* Info del restaurante */}
            <div className="flex-1">
              <h1 className="font-black text-xl text-gray-900 tracking-tight leading-tight mb-1.5">
                {restaurant.name}
              </h1>
              
              {/* Badge de estado con contraste perfecto */}
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

      {/* ==========================================
          MEJORA 2: TARJETAS DE ITEMS MÁS ATRACTIVAS
          ========================================== */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {['pupusas', 'bebidas'].map(category => {
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
                  {category === 'pupusas' ? '🔥 Pupusas' : '🥤 Bebidas'}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-transparent to-transparent"></div>
              </div>
              
              <div className="grid gap-3">
                {items.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="group bg-white p-4 rounded-2xl shadow-md border-2 border-gray-50 flex justify-between items-center cursor-pointer hover:shadow-xl hover:border-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                        {item.image_url || '🥘'}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-base leading-tight group-hover:text-orange-600 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          {item.category === 'pupusas' ? '🌽 Del comal a tu mesa' : '❄️ Bebida refrescante'}
                        </p>
                        <p className="text-orange-600 font-extrabold text-lg mt-1">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <button className="bg-orange-50 text-orange-600 w-11 h-11 rounded-full flex items-center justify-center shadow-sm border-2 border-orange-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 group-hover:shadow-lg transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ==========================================
          MEJORA 3: MODAL MÁS INTUITIVO Y VISUAL
          ========================================== */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 text-8xl opacity-10">
                {selectedItem.category === 'pupusas' ? '🫓' : '🥤'}
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-1">{selectedItem.name}</h3>
                <p className="text-orange-100 text-sm">Personaliza tu orden</p>
              </div>
            </div>

            <div className="p-6">
              {selectedItem.category === 'pupusas' ? (
                <div className="space-y-4">
                  {/* Opción Maíz */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-xl shadow-md">🌽</div>
                        <div>
                          <span className="font-bold text-yellow-900 text-lg block">Maíz</span>
                          <span className="text-xs text-yellow-700">Tradicional</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} 
                          className="w-9 h-9 bg-white rounded-full shadow-md text-xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition"
                        >
                          −
                        </button>
                        <span className="text-2xl font-bold w-8 text-center text-yellow-900">{countMaiz}</span>
                        <button 
                          onClick={() => setCountMaiz(countMaiz + 1)} 
                          className="w-9 h-9 bg-yellow-500 rounded-full shadow-md text-xl font-bold text-white hover:bg-yellow-600 active:scale-95 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opción Arroz */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xl shadow-md">🍚</div>
                        <div>
                          <span className="font-bold text-gray-800 text-lg block">Arroz</span>
                          <span className="text-xs text-gray-600">Sin gluten</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setCountArroz(Math.max(0, countArroz - 1))} 
                          className="w-9 h-9 bg-white rounded-full shadow-md text-xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition"
                        >
                          −
                        </button>
                        <span className="text-2xl font-bold w-8 text-center text-gray-800">{countArroz}</span>
                        <button 
                          onClick={() => setCountArroz(countArroz + 1)} 
                          className="w-9 h-9 bg-gray-700 rounded-full shadow-md text-xl font-bold text-white hover:bg-gray-800 active:scale-95 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-6 py-6">
                  <button 
                    onClick={() => setCountBebida(Math.max(1, countBebida - 1))} 
                    className="w-14 h-14 bg-gray-100 rounded-full shadow-lg text-3xl font-bold text-gray-600 hover:bg-gray-200 active:scale-95 transition"
                  >
                    −
                  </button>
                  <span className="text-5xl font-bold w-16 text-center text-gray-800">{countBebida}</span>
                  <button 
                    onClick={() => setCountBebida(countBebida + 1)} 
                    className="w-14 h-14 bg-orange-500 rounded-full shadow-lg text-3xl font-bold text-white hover:bg-orange-600 active:scale-95 transition"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Botones de acción */}
              <div className="mt-6 space-y-3">
                <button 
                  onClick={addBulkToCart}
                  disabled={totalItemsModal === 0}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Agregar al carrito</span>
                  {totalItemsModal > 0 && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {totalItemsModal} × ${totalPriceModal.toFixed(2)}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="w-full text-gray-500 py-3 hover:text-gray-700 font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MEJORA 4: CHECKOUT MÁS CLARO Y PROFESIONAL
          ========================================== */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up overflow-hidden">
            {/* Header del checkout */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Tu Orden</h3>
                  <p className="text-orange-100 text-sm">{cart.length} items en carrito</p>
                </div>
                <button 
                  onClick={() => clearCart()} 
                  className="text-xs font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                >
                  🗑️ Vaciar
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Lista agrupada mejorada */}
              <div className="bg-gray-50 p-4 rounded-2xl mb-5 max-h-64 overflow-y-auto space-y-3 border border-gray-200">
                {getGroupedCart().map((group: any) => (
                  <div key={group.id + group.dough} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-gray-900 text-base">{group.name}</span>
                      <span className="text-gray-500 text-xs uppercase font-semibold tracking-wide mt-0.5">
                        {group.dough ? `🌽 ${group.dough}` : '🥤 Bebida'}
                      </span>
                      <span className="text-orange-600 font-bold mt-1.5 text-sm">
                        ${group.totalPrice.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <button 
                        onClick={() => decreaseQuantity(group)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 active:bg-gray-200 transition"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-bold text-lg bg-white">{group.quantity}</span>
                      <button 
                        onClick={() => increaseQuantity(group)}
                        className="w-9 h-9 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-50 active:bg-orange-100 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🛒</div>
                    <p className="text-gray-400 font-medium">Carrito vacío</p>
                  </div>
                )}
              </div>

              {/* Total destacado */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-2xl mb-5 border-2 border-orange-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold text-lg">Total a pagar:</span>
                  <span className="text-orange-600 font-extrabold text-3xl">${total().toFixed(2)}</span>
                </div>
              </div>

              {/* Input mejorado */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📍 Identifícate
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Mesa 4 o Juan Pérez"
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-base focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Botones de acción */}
              <button 
                onClick={submitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </span>
                ) : '✅ Enviar a Cocina'}
              </button>
              <button 
                onClick={() => setShowCheckout(false)} 
                className="w-full text-gray-500 py-3 hover:text-gray-700 font-medium transition"
              >
                ← Seguir pidiendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MEJORA 5: BOTÓN FLOTANTE MÁS COMPACTO
          ========================================== */}
      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 animate-slide-up">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setShowCheckout(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-5 rounded-xl flex justify-between items-center shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="font-extrabold text-base">{cart.length}</span>
                </div>
                <span className="text-base">🛒 Ver orden completa</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-orange-100">Total</span>
                <span className="text-xl font-extrabold">${total().toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-up {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}