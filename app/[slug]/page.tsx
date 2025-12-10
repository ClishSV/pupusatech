"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../lib/store' 

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

  // --- LÓGICA DE AGRUPACIÓN (NUEVO CEREBRO VISUAL) ---
  const getGroupedCart = () => {
    const grouped: Record<string, any> = {}

    cart.forEach(item => {
      // Creamos una llave única: ID + MASA (ej: "123-maiz" o "456-undefined")
      const key = `${item.id}-${item.dough || ''}`
      
      if (grouped[key]) {
        grouped[key].quantity += 1
        grouped[key].totalPrice += item.price
        // Guardamos los IDs de los items individuales para poder borrarlos luego
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

  // Funciones para editar desde el checkout (+ / -)
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
    // Borramos el último cartId agregado de ese grupo
    const lastId = item.cartIds[item.cartIds.length - 1]
    if (lastId) {
      removeFromCart(lastId)
    }
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
      items: cart // Enviamos el array completo (flat) para que la base de datos tenga el detalle
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

  // CALCULOS MODAL
  const totalItemsModal = selectedItem?.category === 'pupusas' 
    ? countMaiz + countArroz 
    : countBebida
  
  const totalPriceModal = selectedItem ? (totalItemsModal * selectedItem.price) : 0

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando menú... 🌮</div>
  if (!restaurant) return <div className="p-10 text-center text-red-500">Restaurante no encontrado 😢</div>

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido Enviado!</h2>
          <p className="text-gray-500 mb-6">Tu orden ya está en cocina.</p>
          <button onClick={() => setOrderSuccess(false)} className="bg-green-500 text-white font-bold py-3 px-6 rounded-xl w-full">Pedir más</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white shadow-sm sticky top-0 z-10 p-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="text-4xl">{restaurant.logo_url || '🍽️'}</div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">Menú Digital</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {['pupusas', 'bebidas'].map(category => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <h2 className="text-lg font-bold text-gray-700 mt-4 capitalize">
                {category === 'pupusas' ? '🔥 Pupusas' : '🥤 Bebidas'}
              </h2>
              <div className="space-y-3 mt-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((item: any) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100" onClick={() => handleItemClick(item)}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.image_url}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                        <p className="text-orange-600 font-bold">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <button className="bg-orange-100 text-orange-600 w-10 h-10 rounded-full font-bold text-xl hover:bg-orange-200 transition">
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-bold text-center mb-1">{selectedItem.name}</h3>
            <p className="text-center text-gray-400 mb-6 text-sm">Elige la cantidad</p>

            {selectedItem.category === 'pupusas' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                  <span className="font-bold text-yellow-800 text-lg">🌽 MAÍZ</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} className="w-10 h-10 bg-white rounded-full shadow text-xl font-bold text-gray-600">-</button>
                    <span className="text-2xl font-bold w-6 text-center">{countMaiz}</span>
                    <button onClick={() => setCountMaiz(countMaiz + 1)} className="w-10 h-10 bg-yellow-400 rounded-full shadow text-xl font-bold text-white">+</button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-800 text-lg">🍚 ARROZ</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCountArroz(Math.max(0, countArroz - 1))} className="w-10 h-10 bg-white rounded-full shadow text-xl font-bold text-gray-600">-</button>
                    <span className="text-2xl font-bold w-6 text-center">{countArroz}</span>
                    <button onClick={() => setCountArroz(countArroz + 1)} className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full shadow text-xl font-bold text-gray-600">+</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6 py-4">
                 <button onClick={() => setCountBebida(Math.max(1, countBebida - 1))} className="w-12 h-12 bg-gray-100 rounded-full shadow text-2xl font-bold text-gray-600">-</button>
                 <span className="text-4xl font-bold w-12 text-center">{countBebida}</span>
                 <button onClick={() => setCountBebida(countBebida + 1)} className="w-12 h-12 bg-orange-500 rounded-full shadow text-2xl font-bold text-white">+</button>
              </div>
            )}

            <div className="mt-8">
              <button 
                onClick={addBulkToCart}
                disabled={totalItemsModal === 0}
                className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:text-gray-500"
              >
                Agregar {totalItemsModal > 0 && `(${totalItemsModal})`} • ${totalPriceModal.toFixed(2)}
              </button>
              <button onClick={() => setShowModal(false)} className="mt-3 w-full text-gray-400 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT CONSOLIDADO */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Tu Orden</h3>
              <button onClick={() => clearCart()} className="text-red-500 text-xs font-bold bg-red-50 px-3 py-1 rounded-full">
                Borrar todo
              </button>
            </div>
            
            {/* LISTA AGRUPADA (RESUMIDA) */}
            <div className="bg-gray-50 p-4 rounded-xl mb-4 max-h-56 overflow-y-auto space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {getGroupedCart().map((group: any) => (
                <div key={group.id + group.dough} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-base">{group.name}</span>
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wide">
                      {group.dough ? `Masa: ${group.dough}` : 'Bebida/Otro'}
                    </span>
                    <span className="text-orange-600 font-semibold mt-1">
                      ${group.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* CONTROLES + y - */}
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm">
                    <button 
                      onClick={() => decreaseQuantity(group)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 rounded-l-lg"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{group.quantity}</span>
                    <button 
                      onClick={() => increaseQuantity(group)}
                      className="w-8 h-8 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-50 rounded-r-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && <p className="text-center text-gray-400">Carrito vacío</p>}
            </div>

            <div className="flex justify-between font-bold text-xl mb-6 px-2 border-t border-gray-200 pt-4">
              <span>Total:</span>
              <span className="text-orange-600">${total().toFixed(2)}</span>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre o Mesa</label>
            <input 
              type="text" 
              placeholder="Ej: Mesa 4"
              className="w-full border-2 border-gray-200 rounded-xl p-3 mb-4 focus:border-orange-500 outline-none text-lg"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <button 
              onClick={submitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : '✅ Enviar a Cocina'}
            </button>
            <button onClick={() => setShowCheckout(false)} className="mt-4 w-full text-gray-400">Seguir pidiendo</button>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 p-4 z-40">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setShowCheckout(true)}
              className="w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex justify-between items-center shadow-lg hover:bg-orange-700 transition"
            >
              <div className="flex flex-col items-start leading-none">
                <span className="text-sm font-normal text-orange-200">Ver orden</span>
                <span>{cart.length} items</span>
              </div>
              <span className="text-xl">${total().toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}