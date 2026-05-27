"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams } from 'next/navigation'
import { useCartStore } from '../../../lib/store' 
import Link from 'next/link'

const QUICK_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', 'LLEVAR']

export default function WaiterPage() {
  const params = useParams()
  const slug = params?.slug as string

 
  const [restaurant, setRestaurant] = useState<any>(null)
 
  const [menu, setMenu] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

 
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string>('') 
  
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [lastOrderTable, setLastOrderTable] = useState('')

  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)

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

 
  const handleItemClick = (item: any) => { setSelectedItem(item); setCountMaiz(0); setCountArroz(0); setCountBebida(1); setShowModal(true) }

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

 
  const increaseQuantity = (item: any) => addToCart({ cartId: crypto.randomUUID(), id: item.id, name: item.name, price: item.price, dough: item.dough })
 
  const decreaseQuantity = (item: any) => { const lastId = item.cartIds[item.cartIds.length - 1]; if (lastId) removeFromCart(lastId) }

  const submitOrder = async () => {
    if (!selectedTable) { alert("⚠️ Selecciona una mesa primero"); return }
    
    setIsSubmitting(true)
    const tableName = selectedTable === 'LLEVAR' ? 'Para Llevar' : `Mesa ${selectedTable}`

    const { error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id,
      table_number: tableName, 
      status: 'pending',
      total: total(),
      items: cart
    })

    setIsSubmitting(false)

    if (error) {
      alert("Error al enviar")
    } else {
      setLastOrderTable(tableName)
      setShowSuccessToast(true)
      clearCart()
      setShowCheckout(false)
      setSelectedTable('') 
      setTimeout(() => setShowSuccessToast(false), 2500)
    }
  }

  const totalItemsModal = selectedItem?.category === 'pupusas' ? countMaiz + countArroz : countBebida

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500 bg-gray-900">Cargando Sistema...</div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Error</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-32 font-sans">
      
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce w-[90%] max-w-sm border-2 border-green-400">
            <div className="text-4xl">✅</div>
            <div>
                <p className="font-black text-lg">¡ENVIADO!</p>
                <p className="text-sm text-green-100 font-medium">{lastOrderTable} procesada correctamente.</p>
            </div>
        </div>
      )}

      <div className="sticky top-0 z-20 bg-gray-900 shadow-xl border-b border-gray-800 text-white">
        <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h1 className="font-bold text-lg leading-none">{restaurant.name}</h1>
                    <p className="text-xs text-gray-400 mt-1 font-mono">MODO COMANDERA v1.0</p>
                </div>
                <Link href={`/${slug}/admin`} className="bg-gray-800 border border-gray-700 p-2 rounded-lg text-xs hover:bg-gray-700 transition">
                    Ir a Cocina 👨‍🍳
                </Link>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {QUICK_TABLES.map(mesa => (
                    <button
                        key={mesa}
                        onClick={() => setSelectedTable(mesa)}
                        className={`flex-shrink-0 w-14 h-12 rounded-lg font-bold transition-all border-2 flex items-center justify-center ${
                            selectedTable === mesa
                            ? 'bg-orange-600 border-orange-400 text-white scale-105 shadow-lg' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        {mesa === 'LLEVAR' ? '🛍️' : mesa}
                    </button>
                ))}
            </div>
            
            {selectedTable && (
                <div className="bg-orange-600/20 border border-orange-600/50 text-orange-400 text-center text-xs font-bold py-1 mt-1 rounded uppercase tracking-wider">
                    Tomando orden para: {selectedTable === 'LLEVAR' ? 'Llevar' : `Mesa ${selectedTable}`}
                </div>
            )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-3 space-y-4 mt-2">
        {['pupusas', 'extras', 'bebidas', 'postres'].map(category => {
         
          const items = menu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category}>
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 border-b border-gray-300 pb-1">{category}</h2>
              <div className="grid grid-cols-2 gap-2">
              
                {items.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 active:scale-95 transition-transform cursor-pointer relative overflow-hidden h-24 flex flex-col justify-between hover:border-orange-300"
                  >
                    <div className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">
                        {item.name}
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-gray-400 font-mono">${item.price.toFixed(2)}</span>
                        <div className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">+</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black text-gray-900 text-center mb-6 border-b pb-4">{selectedItem.name}</h3>
            
            {selectedItem.category === 'pupusas' ? (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                    <span className="font-bold text-yellow-900">🌽 MAÍZ</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} className="w-12 h-12 bg-white shadow rounded-full font-bold text-2xl text-gray-500">-</button>
                        <span className="text-3xl font-black w-8 text-center text-gray-900">{countMaiz}</span>
                        <button onClick={() => setCountMaiz(countMaiz + 1)} className="w-12 h-12 bg-yellow-400 shadow rounded-full font-bold text-2xl text-white">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 p-3 rounded-xl border border-gray-200">
                    <span className="font-bold text-gray-700">🍚 ARROZ</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCountArroz(Math.max(0, countArroz - 1))} className="w-12 h-12 bg-white shadow rounded-full font-bold text-2xl text-gray-500">-</button>
                        <span className="text-3xl font-black w-8 text-center text-gray-900">{countArroz}</span>
                        <button onClick={() => setCountArroz(countArroz + 1)} className="w-12 h-12 bg-gray-300 shadow rounded-full font-bold text-2xl text-white">+</button>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-8 mb-8">
                    <button onClick={() => setCountBebida(Math.max(1, countBebida - 1))} className="w-16 h-16 bg-gray-200 rounded-full font-bold text-3xl text-gray-600">-</button>
                    <span className="text-6xl font-black text-gray-900">{countBebida}</span>
                    <button onClick={() => setCountBebida(countBebida + 1)} className="w-16 h-16 bg-orange-500 rounded-full font-bold text-3xl text-white">+</button>
                </div>
            )}

            <button 
                onClick={addBulkToCart} 
                disabled={(selectedItem.category === 'pupusas' ? countMaiz + countArroz : countBebida) === 0}
                className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl text-xl shadow-xl active:scale-95 transition disabled:opacity-50"
            >
                AGREGAR {totalItemsModal > 0 && `(${totalItemsModal})`}
            </button>
            
            <button onClick={() => setShowModal(false)} className="w-full text-gray-400 py-4 mt-2 font-bold">Cancelar</button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm shadow-2xl h-[85vh] flex flex-col animate-slide-up">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg">
                <h2 className="text-xl font-black flex flex-col leading-none">
                    <span>Confirmar Orden</span>
                    <span className="text-xs text-orange-400 font-mono mt-1">{selectedTable ? (selectedTable === 'LLEVAR' ? '🛍️ PARA LLEVAR' : `MESA ${selectedTable}`) : '⚠️ SIN MESA'}</span>
                </h2>
                <button onClick={() => setShowCheckout(false)} className="text-gray-400 font-bold px-2">Volver</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
             
                {getGroupedCart().map((group: any) => (
                    <div key={group.id + group.dough} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div>
                            <div className="font-bold text-gray-800">{group.name}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{group.dough}</div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                            <button onClick={() => decreaseQuantity(group)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-lg font-bold text-red-500">-</button>
                            <span className="font-bold text-lg min-w-[20px] text-center text-gray-900">{group.quantity}</span>
                            <button onClick={() => increaseQuantity(group)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-lg font-bold text-green-600">+</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white pb-8">
                <div className="flex justify-between text-2xl font-black mb-4 text-gray-900">
                    <span>Total:</span>
                    <span>${total().toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button onClick={() => clearCart()} className="col-span-1 bg-red-100 text-red-600 font-bold rounded-xl py-3 text-xs">BORRAR</button>
                    <button 
                        onClick={submitOrder}
                        disabled={isSubmitting}
                        className="col-span-3 bg-green-600 text-white font-black rounded-xl text-xl shadow-xl hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'ENVIANDO...' : '🚀 ENVIAR ORDEN'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3">
          <div className="max-w-md mx-auto">
            <button 
                onClick={() => {
                    if(!selectedTable) { alert("⚠️ SELECCIONA UNA MESA ARRIBA"); window.scrollTo({top:0, behavior:'smooth'}); return; }
                    setShowCheckout(true);
                }}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-2xl flex justify-between px-6 border-2 border-gray-700 hover:border-gray-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="bg-orange-600 px-3 py-1 rounded-full text-sm font-black">{cart.length}</span>
                <span>VER COMANDA</span>
              </div>
              <span className="text-xl font-mono text-orange-400">${total().toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
      `}</style>
    </div>
  )
}