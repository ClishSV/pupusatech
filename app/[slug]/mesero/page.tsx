"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase' 
import { useParams } from 'next/navigation'
import { useCartStore } from '../../../lib/store' 
import Link from 'next/link'

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
  const [takeoutName, setTakeoutName] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [lastOrderTable, setLastOrderTable] = useState('')

  const [countMaiz, setCountMaiz] = useState(0)
  const [countArroz, setCountArroz] = useState(0)
  const [countBebida, setCountBebida] = useState(1)
  
  const [searchTerm, setSearchTerm] = useState('')

  const { cart, addToCart, removeFromCart, total, clearCart } = useCartStore()

  // 💡 REGLA INTELIGENTE PARA PUPUSAS
  const isPupusaItem = (item: any) => {
    if (!item) return false;
    const catName = (item.category || '').toLowerCase();
    const itemName = (item.name || '').toLowerCase();
    const pupusaKeywords = ['pupusa', 'tradicional', 'especial', 'mixta', 'internacional', 'loca', 'birria'];
    return pupusaKeywords.some(kw => catName.includes(kw) || itemName.includes(kw));
  }

  // 💡 ORDENADOR DE CATEGORÍAS (La Báscula)
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
    if (isPupusaItem(selectedItem)) { 
      for (let i = 0; i < countMaiz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'maiz' })
      for (let i = 0; i < countArroz; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, dough: 'arroz' })
    } else {
      for (let i = 0; i < countBebida; i++) addToCart({ cartId: crypto.randomUUID(), id: selectedItem.id, name: selectedItem.name, price: selectedItem.price })
    }
    setShowModal(false); setSelectedItem(null); setSearchTerm('')
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
    if (selectedTable === 'LLEVAR' && !takeoutName.trim()) { alert("⚠️ Ingresa el nombre para llevar."); return; }

    setIsSubmitting(true)
    const tableName = selectedTable === 'LLEVAR' ? `🛍️ LLEVAR: ${takeoutName.trim()}` : `Mesa ${selectedTable}`

    const { error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id, table_number: tableName, status: 'pending', total: total(), items: cart
    })

    setIsSubmitting(false)
    if (error) { alert("Error al enviar") } 
    else {
      setLastOrderTable(tableName); setShowSuccessToast(true); clearCart(); setShowCheckout(false); setSelectedTable(''); setTakeoutName('');
      setTimeout(() => setShowSuccessToast(false), 2500)
    }
  }

  const totalItemsModal = isPupusaItem(selectedItem) ? countMaiz + countArroz : countBebida

  const tableCount = restaurant?.table_count || 15;
  const dynamicTables = [...Array.from({ length: tableCount }, (_, i) => (i + 1).toString()), 'LLEVAR']

  // LÓGICA DEL BUSCADOR
  const filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Categorías ordenadas en el mesero
  const categoriesToRender = Array.from(new Set(filteredMenu.map(item => item.category)))
    .sort((a: any, b: any) => getCategoryWeight(a) - getCategoryWeight(b) || a.localeCompare(b));

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500 bg-gray-900 text-white">Cargando Sistema...</div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Error: Restaurante no encontrado</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-32 font-sans">
      
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce w-[90%] max-w-sm border-4 border-white">
            <div className="text-5xl">✅</div>
            <div><p className="font-black text-2xl">¡ENVIADO!</p><p className="text-base text-green-100 font-medium line-clamp-1">{lastOrderTable}</p></div>
        </div>
      )}

      <div className="sticky top-0 z-20 bg-gray-900 shadow-xl border-b-4 border-gray-800 text-white">
        <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="font-black text-xl leading-none text-orange-400">{restaurant.name}</h1>
                    <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest">PEDIDO EN MESA v1.2</p>
                </div>
                <Link href={`/${slug}/admin`} className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-700 transition shadow-sm">
                    Cocina 👨‍🍳
                </Link>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                {dynamicTables.map(mesa => (
                    <button key={mesa} onClick={() => setSelectedTable(mesa)} className={`flex-shrink-0 w-16 h-14 rounded-xl font-black text-lg transition-all border-2 flex items-center justify-center shadow-sm ${selectedTable === mesa ? 'bg-orange-600 border-orange-400 text-white scale-105 shadow-orange-500/50' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                        {mesa === 'LLEVAR' ? '🛍️' : mesa}
                    </button>
                ))}
            </div>
            
            {selectedTable && (
                <div className="bg-orange-500 text-white text-center text-sm font-black py-2 mt-1 rounded-lg uppercase tracking-widest shadow-inner">
                    ORDEN: {selectedTable === 'LLEVAR' ? 'PARA LLEVAR' : `MESA ${selectedTable}`}
                </div>
            )}
        </div>

        {/* BUSCADOR */}
        <div className="bg-gray-800 px-4 py-3">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-3 border-2 border-gray-700 rounded-xl leading-5 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-bold transition-colors text-lg"
              placeholder="Buscar platillo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white">
                ✖️
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-3 space-y-6 mt-4">
        {categoriesToRender.map(category => {
          const items = filteredMenu.filter((item: any) => item.category === category)
          if (items.length === 0) return null
          
          return (
            <div key={category as string} className="mb-6">
              <div className="bg-gray-200 rounded-xl px-4 py-3 mb-3 shadow-sm flex items-center gap-2">
                <span className="text-2xl">
                    {String(category).toLowerCase().includes('pupusa') || String(category).toLowerCase().includes('tradicional') || String(category).toLowerCase().includes('especial') || String(category).toLowerCase().includes('mixta') || String(category).toLowerCase().includes('loca') ? '🔥' :
                     String(category).toLowerCase().includes('bebida') ? '🥤' :
                     String(category).toLowerCase().includes('postre') ? '🍰' : '🍽️'}
                </span>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">{category as string}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {items.map((item: any) => (
                  <div key={item.id} onClick={() => handleItemClick(item)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-300 active:scale-95 transition-transform cursor-pointer relative flex flex-col justify-between min-h-[110px] hover:border-orange-500">
                    
                    {/* TEXTO GRANDE SIN FOTO (UX POS) */}
                    <div className="font-black text-gray-900 text-[15px] leading-snug mb-3">
                        {item.name}
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto">
                        <span className="text-sm text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-md border border-gray-200">${item.price.toFixed(2)}</span>
                        <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center text-orange-600 font-black text-xl shadow-sm">+</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {filteredMenu.length === 0 && (
          <div className="text-center py-10 text-gray-500 font-bold">
            No se encontraron platillos. 🧐
          </div>
        )}
      </div>

      {/* MODAL CANTIDAD (SIN FOTO PARA VELOCIDAD) */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl animate-slide-up">
            
            <h3 className="text-2xl font-black text-gray-900 text-center mb-6 border-b border-gray-200 pb-4">
              {selectedItem.name}
            </h3>
            
            {isPupusaItem(selectedItem) ? (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-2xl border-2 border-yellow-200">
                    <span className="font-black text-yellow-900 text-xl">🌽 MAÍZ</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCountMaiz(Math.max(0, countMaiz - 1))} className="w-14 h-14 bg-white shadow-md rounded-full font-black text-3xl text-gray-400 active:scale-95">-</button>
                        <span className="text-4xl font-black w-10 text-center">{countMaiz}</span>
                        <button onClick={() => setCountMaiz(countMaiz + 1)} className="w-14 h-14 bg-yellow-400 shadow-md rounded-full font-black text-3xl text-white active:scale-95">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 p-3 rounded-2xl border-2 border-gray-300">
                    <span className="font-black text-gray-700 text-xl">🍚 ARROZ</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCountArroz(Math.max(0, countArroz - 1))} className="w-14 h-14 bg-white shadow-md rounded-full font-black text-3xl text-gray-400 active:scale-95">-</button>
                        <span className="text-4xl font-black w-10 text-center">{countArroz}</span>
                        <button onClick={() => setCountArroz(countArroz + 1)} className="w-14 h-14 bg-gray-400 shadow-md rounded-full font-black text-3xl text-white active:scale-95">+</button>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-8 mb-8">
                    <button onClick={() => setCountBebida(Math.max(1, countBebida - 1))} className="w-16 h-16 bg-gray-200 rounded-full font-black text-4xl text-gray-500 active:scale-95">-</button>
                    <span className="text-6xl font-black">{countBebida}</span>
                    <button onClick={() => setCountBebida(countBebida + 1)} className="w-16 h-16 bg-orange-500 rounded-full font-black text-4xl text-white active:scale-95">+</button>
                </div>
            )}

            <button onClick={addBulkToCart} disabled={totalItemsModal === 0} className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl text-2xl shadow-xl active:scale-95 transition disabled:opacity-50">
                AGREGAR {totalItemsModal > 0 && `(${totalItemsModal})`}
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-gray-500 py-4 mt-2 font-bold text-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* CHECKOUT RÁPIDO */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm shadow-2xl h-[90vh] flex flex-col animate-slide-up">
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-lg rounded-t-3xl sm:rounded-t-2xl">
                <h2 className="text-2xl font-black flex flex-col leading-none">
                    <span>Confirmar Orden</span>
                    <span className="text-sm text-orange-400 font-mono mt-1">{selectedTable ? (selectedTable === 'LLEVAR' ? '🛍️ PARA LLEVAR' : `MESA ${selectedTable}`) : '⚠️ SIN MESA'}</span>
                </h2>
                <button onClick={() => setShowCheckout(false)} className="text-gray-400 font-bold px-3 py-2 bg-gray-800 rounded-lg">Volver</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {getGroupedCart().map((group: any) => (
                    <div key={group.id + group.dough} className="flex justify-between items-center bg-white p-3 rounded-xl border-2 border-gray-200 shadow-sm">
                        <div className="flex-1">
                            <div className="font-black text-gray-800 text-lg leading-tight">{group.name}</div>
                            <div className="text-xs text-orange-600 font-black uppercase tracking-widest mt-1">{group.dough}</div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1 border border-gray-200 ml-2">
                            <button onClick={() => decreaseQuantity(group)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-2xl font-black text-red-500 active:scale-95">-</button>
                            <span className="font-black text-xl min-w-[24px] text-center text-gray-900">{group.quantity}</span>
                            <button onClick={() => increaseQuantity(group)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-2xl font-black text-green-600 active:scale-95">+</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-5 border-t-2 border-gray-200 bg-white pb-8">
                
                {selectedTable === 'LLEVAR' && (
                    <div className="mb-4 bg-orange-50 p-4 rounded-2xl border-2 border-orange-200">
                        <label className="block text-sm font-black text-orange-800 mb-2 uppercase tracking-wide">Nombre del Cliente:</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Don Carlos"
                            className="w-full bg-white border-2 border-orange-300 rounded-xl p-4 outline-none focus:border-orange-500 font-black text-gray-800 text-lg shadow-inner"
                            value={takeoutName}
                            onChange={(e) => setTakeoutName(e.target.value)}
                        />
                    </div>
                )}

                <div className="flex justify-between text-3xl font-black mb-6 text-gray-900 bg-gray-100 p-4 rounded-2xl">
                    <span>Total:</span>
                    <span className="text-orange-600">${total().toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <button onClick={() => clearCart()} className="col-span-1 bg-red-100 text-red-600 font-black rounded-xl py-4 text-xs tracking-widest active:scale-95 transition-transform border border-red-200">BORRAR</button>
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent pt-10">
          <div className="max-w-md mx-auto">
            <button 
                onClick={() => {
                    if(!selectedTable) { alert("⚠️ SELECCIONA UNA MESA ARRIBA"); window.scrollTo({top:0, behavior:'smooth'}); return; }
                    setShowCheckout(true);
                }}
                className="w-full bg-gray-900 text-white font-bold py-5 rounded-2xl shadow-2xl flex justify-between px-6 border-4 border-gray-800 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="bg-orange-500 px-4 py-1.5 rounded-full text-lg font-black">{cart.length}</span>
                <span className="text-lg tracking-wide">VER ORDEN</span>
              </div>
              <span className="text-2xl font-black text-orange-400">${total().toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  )
}