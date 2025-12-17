"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function MenuManagerPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState<string>('')

  // 1. CARGAR DATOS
  useEffect(() => {
    async function fetchData() {
      if (!slug) return

      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restData.id)
        .order('category', { ascending: false })
        .order('name', { ascending: true })

      if (menuData) setMenuItems(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // 2. CAMBIAR DISPONIBILIDAD (SWITCH)
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
  }

  // 3. ACTUALIZAR PRECIO
  const startEditing = (item: any) => {
    setEditingId(item.id)
    setTempPrice(item.price.toString())
  }

  const savePrice = async (id: string) => {
    const newPrice = parseFloat(tempPrice)
    if (isNaN(newPrice)) return

    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item))
    setEditingId(null)

    await supabase.from('menu_items').update({ price: newPrice }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <p className="text-xl text-gray-600 font-semibold">Cargando menú...</p>
        </div>
      </div>
    )
  }

  const pupusas = menuItems.filter(item => item.category === 'pupusas')
  const bebidas = menuItems.filter(item => item.category === 'bebidas')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50 pb-20">
      
      {/* ==========================================
          HEADER PROFESIONAL
          ========================================== */}
      <div className="bg-white shadow-xl sticky top-0 z-20 border-b-2 border-orange-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            href={`/${slug}/admin`}
            className="bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-lg shadow-md">
                📝
              </div>
              <h1 className="font-black text-xl text-gray-900 tracking-tight">Editor de Menú</h1>
            </div>
            <p className="text-xs text-gray-500 font-medium">{restaurant?.name}</p>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-br from-orange-50 to-red-50 px-4 py-2 rounded-xl border border-orange-200">
            <span className="text-xl font-black text-orange-600">{menuItems.length}</span>
            <span className="text-xs text-gray-600 font-bold">Items</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* ==========================================
            SECCIÓN: PUPUSAS
            ========================================== */}
        {pupusas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                <span className="text-2xl">🫓</span> Pupusas
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-transparent to-transparent"></div>
            </div>

            <div className="space-y-3">
              {pupusas.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-2xl shadow-md border-l-4 transition-all hover:shadow-lg ${
                    item.is_available 
                      ? 'border-green-500' 
                      : 'border-gray-300 opacity-60'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* CONTENEDOR DE IMAGEN/EMOJI */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {item.image_url && item.image_url.startsWith('/') ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">{item.image_url || '🥘'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base mb-1">{item.name}</h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* SWITCH DISPONIBILIDAD */}
                      <div className="flex flex-col items-end gap-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={item.is_available}
                            onChange={() => toggleAvailability(item.id, item.is_available)}
                          />
                          <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                        </label>
                        <span className={`text-[9px] font-extrabold tracking-wider ${
                          item.is_available ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {item.is_available ? '✓ DISPONIBLE' : '✗ AGOTADO'}
                        </span>
                      </div>
                    </div>

                    {/* SECCIÓN DE PRECIO */}
                    <div className="flex items-center justify-between bg-gradient-to-br from-gray-50 to-gray-100 p-3.5 rounded-xl border border-gray-200">
                      <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                        <span className="text-lg">💵</span> Precio Unitario
                      </span>
                      
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">$</span>
                          <input 
                            type="number" 
                            step="0.05"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="w-24 p-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 text-right font-bold text-gray-900 shadow-sm"
                            autoFocus
                          />
                          <button 
                            onClick={() => savePrice(item.id)} 
                            className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-all shadow-sm active:scale-95"
                          >
                            ✓ OK
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="text-red-500 hover:text-red-600 text-lg px-2 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">
                            ${item.price.toFixed(2)}
                          </span>
                          <div className="bg-orange-100 text-orange-600 p-1.5 rounded-lg group-hover:bg-orange-200 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            SECCIÓN: BEBIDAS
            ========================================== */}
        {bebidas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                <span className="text-2xl">🥤</span> Bebidas
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-transparent to-transparent"></div>
            </div>

            <div className="space-y-3">
              {bebidas.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-2xl shadow-md border-l-4 transition-all hover:shadow-lg ${
                    item.is_available 
                      ? 'border-blue-500' 
                      : 'border-gray-300 opacity-60'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* CONTENEDOR DE IMAGEN/EMOJI */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {item.image_url && item.image_url.startsWith('/') ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">{item.image_url || '🥘'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base mb-1">{item.name}</h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* SWITCH DISPONIBILIDAD */}
                      <div className="flex flex-col items-end gap-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={item.is_available}
                            onChange={() => toggleAvailability(item.id, item.is_available)}
                          />
                          <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
                        </label>
                        <span className={`text-[9px] font-extrabold tracking-wider ${
                          item.is_available ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {item.is_available ? '✓ DISPONIBLE' : '✗ AGOTADO'}
                        </span>
                      </div>
                    </div>

                    {/* SECCIÓN DE PRECIO */}
                    <div className="flex items-center justify-between bg-gradient-to-br from-gray-50 to-gray-100 p-3.5 rounded-xl border border-gray-200">
                      <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                        <span className="text-lg">💵</span> Precio Unitario
                      </span>
                      
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">$</span>
                          <input 
                            type="number" 
                            step="0.05"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="w-24 p-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 text-right font-bold text-gray-900 shadow-sm"
                            autoFocus
                          />
                          <button 
                            onClick={() => savePrice(item.id)} 
                            className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-all shadow-sm active:scale-95"
                          >
                            ✓ OK
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="text-red-500 hover:text-red-600 text-lg px-2 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">
                            ${item.price.toFixed(2)}
                          </span>
                          <div className="bg-orange-100 text-orange-600 p-1.5 rounded-lg group-hover:bg-orange-200 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje si no hay items */}
        {menuItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-white rounded-3xl p-12 shadow-xl text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Menú Vacío</h3>
              <p className="text-gray-500 text-sm">No hay items configurados todavía</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}