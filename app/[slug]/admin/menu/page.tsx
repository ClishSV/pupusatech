"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ==========================================
// 1. DICCIONARIO AGRUPADO (PLANTILLAS)
// ==========================================
const MENU_TEMPLATES = {
  "🔥 Básicos de Pupusería": [
    { name: 'Pupusa de Queso', price: 0.80, category: 'Pupusas' },
    { name: 'Pupusa Revuelta', price: 0.80, category: 'Pupusas' },
    { name: 'Pupusa de Frijol con Queso', price: 0.75, category: 'Pupusas' },
    { name: 'Pupusa de Loroco', price: 0.80, category: 'Pupusas' },
    { name: 'Pupusa de Ayote', price: 0.75, category: 'Pupusas' },
  ],
  "✨ Extras y Complementos": [
    { name: 'Porción de Curtido', price: 0.50, category: 'Extras' },
    { name: 'Salsa de Tomate Extra', price: 0.25, category: 'Extras' },
  ],
  "🥤 Bebidas Populares": [
    { name: 'Horchata', price: 1.00, category: 'Bebidas' },
    { name: 'Fresco de Arrayán', price: 1.00, category: 'Bebidas' },
    { name: 'Fresco de Jamaica', price: 1.00, category: 'Bebidas' },
    { name: 'Coca Cola', price: 1.25, category: 'Bebidas' },
    { name: 'Café Caliente', price: 0.75, category: 'Bebidas' },
  ],
  "🍰 Postres": [
    { name: 'Empanadas de Leche', price: 1.00, category: 'Postres' },
    { name: 'Plátano Frito', price: 1.00, category: 'Postres' },
  ]
}

export default function MenuManagerPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)

  // ESTADOS PARA CREAR ITEM PERSONALIZADO
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: '' })

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
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (menuData) setMenuItems(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // --- FUNCIONES CORE DEL MENÚ ---
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
  }

  const startEditing = (item: any) => { setEditingId(item.id); setTempPrice(item.price.toString()) }

  const savePrice = async (id: string) => {
    const newPrice = parseFloat(tempPrice)
    if (isNaN(newPrice)) return
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item))
    setEditingId(null)
    await supabase.from('menu_items').update({ price: newPrice }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    if(!confirm('¿Seguro que quieres borrar este producto de tu menú?')) return;
    setMenuItems(prev => prev.filter(item => item.id !== id))
    await supabase.from('menu_items').delete().eq('id', id)
  }

  // --- FUNCIONES CREADOR EXPRESS ---
  const addTemplateToMenu = async (template: any) => {
    setIsAdding(true)
    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id,
      name: template.name,
      price: template.price,
      category: template.category,
      is_available: true
    }).select().single()

    if (!error && data) setMenuItems(prev => [...prev, data])
    setIsAdding(false)
  }

  const addCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItem.name || !customItem.price || !customItem.category) return alert("Llena todos los campos")
    
    setIsAdding(true)
    // Formatear categoría (Primera letra mayúscula)
    const formattedCategory = customItem.category.charAt(0).toUpperCase() + customItem.category.slice(1).toLowerCase()

    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id,
      name: customItem.name,
      price: parseFloat(customItem.price),
      category: formattedCategory,
      is_available: true
    }).select().single()

    if (!error && data) {
      setMenuItems(prev => [...prev, data])
      setShowCustomModal(false)
      setCustomItem({ name: '', price: '', category: '' }) // Reset
    }
    setIsAdding(false)
  }

  // --- AYUDANTES ---
  const isItemInMenu = (name: string) => menuItems.some(item => item.name.toLowerCase() === name.toLowerCase())
  
  // Extraer categorías únicas para organizar la vista y el autocompletado
  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)))

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-orange-500 font-bold">Cargando menú...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-32 font-sans">
      
      {/* HEADER */}
      <div className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${slug}/admin`} className="bg-gray-100 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all active:scale-95">
              ← Volver
            </Link>
            <div>
              <h1 className="font-black text-lg text-gray-900 leading-none">Tu Menú</h1>
              <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-1">{restaurant?.name}</p>
            </div>
          </div>
          <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
            {menuItems.length} items
          </div>
        </div>
      </div>

      {/* ==========================================
          SECCIÓN 1: AGREGAR RÁPIDO (CHIPS AGRUPADOS)
          ========================================== */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Agrega productos con un tap</h2>
            <button
                onClick={() => setShowCustomModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:scale-105 shadow-sm"
            >
                ➕ Crear Nuevo
            </button>
          </div>
          
          <div className="space-y-6">
            {Object.entries(MENU_TEMPLATES).map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="text-xs font-bold text-gray-400 mb-2">{groupName}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((template, idx) => {
                    const exists = isItemInMenu(template.name)
                    return (
                      <button
                        key={idx}
                        onClick={() => !exists && addTemplateToMenu(template)}
                        disabled={exists || isAdding}
                        className={`px-4 py-2 rounded-full font-bold text-xs transition-all border-2 ${
                          exists 
                            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' 
                            : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-400 hover:scale-105 active:scale-95 shadow-sm'
                        }`}
                      >
                        {template.name} {!exists && <span className="opacity-50 ml-1">+</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          SECCIÓN 2: MI MENÚ ACTIVO (CATEGORÍAS DINÁMICAS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        
        {uniqueCategories.map(category => {
          const itemsInCategory = menuItems.filter(item => item.category === category)
          
          return (
            <div key={category} className="mb-8">
              {/* Título Dinámico */}
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2 mb-4 uppercase border-b-2 border-gray-200 pb-2">
                {category}
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-1">{itemsInCategory.length}</span>
              </h2>

              <div className="space-y-3">
                {itemsInCategory.map((item) => {
                  // Lógica Visual: ¿Es foto o inicial?
                  const hasPhotoUrl = item.image_url && (item.image_url.startsWith('/') || item.image_url.startsWith('http'));
                  const firstLetter = item.name.charAt(0).toUpperCase();

                  return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow-sm border-l-4 transition-all ${item.is_available ? 'border-green-500' : 'border-gray-300 opacity-60'}`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          
                          {/* CONTENEDOR FOTO / MONOGRAMA */}
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center shrink-0 border border-orange-100 overflow-hidden shadow-inner">
                            {hasPhotoUrl ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/>
                            ) : (
                              <span className="text-2xl font-black text-orange-400">{firstLetter}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 pr-2">
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>
                          </div>
                        </div>

                        {/* ACCIONES (SWITCH Y BASURERO) */}
                        <div className="flex items-center gap-4">
                          <label className="relative inline-flex items-center cursor-pointer" title={item.is_available ? 'Desactivar' : 'Activar'}>
                            <input type="checkbox" className="sr-only peer" checked={item.is_available} onChange={() => toggleAvailability(item.id, item.is_available)}/>
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                          </label>
                          <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 rounded-lg hover:bg-red-50" title="Borrar Producto">
                             🗑️
                          </button>
                        </div>
                      </div>

                      {/* EDITOR DE PRECIO */}
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Precio</span>
                        
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">$</span>
                            <input 
                              type="number" step="0.05" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 p-2 border-2 border-orange-300 rounded-lg focus:outline-none text-right font-bold" autoFocus
                            />
                            <button onClick={() => savePrice(item.id)} className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95 shadow-md">OK</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(item)} className="flex items-center gap-2 group bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:border-orange-300">
                            <span className="text-lg font-black text-gray-900 group-hover:text-orange-600 transition-colors">${item.price.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">✏️ Editar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {menuItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-gray-700">Tu menú está vacío</h3>
            <p className="text-gray-500 mt-2 max-w-xs mx-auto text-sm">Toca los botones naranjas de arriba para agregar tus primeros productos en segundos.</p>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: CREAR ITEM PERSONALIZADO (MEJORADO)
          ========================================== */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white">
                <h3 className="text-xl font-black">Crear Nuevo Plato</h3>
                <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={addCustomItem} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre del Plato</label>
                <input required type="text" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" placeholder="Ej: Hamburguesa Sencilla"/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Precio ($)</label>
                  <input required type="number" step="0.01" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" placeholder="3.50"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoría</label>
                {/* Datalist permite escribir texto libre, o elegir de los existentes */}
                <input 
                  required 
                  type="text" 
                  list="categoriesList"
                  value={customItem.category} 
                  onChange={e => setCustomItem({...customItem, category: e.target.value})} 
                  className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" 
                  placeholder="Ej: Entradas, Mariscos..."
                />
                <datalist id="categoriesList">
                  {uniqueCategories.length > 0 ? (
                    uniqueCategories.map(cat => <option key={cat} value={cat} />)
                  ) : (
                    <>
                      <option value="Pupusas" />
                      <option value="Bebidas" />
                      <option value="Postres" />
                    </>
                  )}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">Escribe una nueva o selecciona una existente.</p>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isAdding} className="w-full bg-orange-600 text-white font-black text-lg py-4 rounded-xl hover:bg-orange-700 disabled:opacity-50 shadow-lg active:scale-95 transition-all">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.2s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}