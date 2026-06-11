"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// DICCIONARIO DE PLATILLOS (Plantillas)
const MENU_TEMPLATES = {
  "🔥 Básicos de Pupusería": [
    { name: 'Pupusa de Queso', price: 0.80, category: 'Pupusas' },
    { name: 'Pupusa Revuelta', price: 0.80, category: 'Pupusas' },
    { name: 'Pupusa de Frijol con Queso', price: 0.75, category: 'Pupusas' },
    { name: 'Pupusa de Loroco', price: 0.80, category: 'Pupusas' },
  ],
  "✨ Extras y Complementos": [
    { name: 'Porción de Curtido', price: 0.50, category: 'Extras' },
    { name: 'Salsa de Tomate Extra', price: 0.25, category: 'Extras' },
  ],
  "🥤 Bebidas Populares": [
    { name: 'Horchata', price: 1.00, category: 'Bebidas' },
    { name: 'Coca Cola', price: 1.25, category: 'Bebidas' },
    { name: 'Café Caliente', price: 0.75, category: 'Bebidas' },
  ]
}

export default function MenuManagerPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  // ESTADOS DEL MODAL (AHORA SIRVE PARA CREAR Y EDITAR)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [targetCategory, setTargetCategory] = useState<string>('') 
  // Nota: Agregamos 'id' al estado para saber si estamos editando
  const [customItem, setCustomItem] = useState({ id: '', name: '', price: '', category: '' })

  useEffect(() => {
    async function fetchData() {
      if (!slug) return
      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restData.id)
      if (menuData) setMenuItems(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // --- DISPONIBILIDAD Y BORRADO ---
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    if(!confirm('¿Seguro que quieres borrar este producto de tu menú?')) return;
    setMenuItems(prev => prev.filter(item => item.id !== id))
    await supabase.from('menu_items').delete().eq('id', id)
  }

  // --- FUNCIONES DEL MODAL (CREAR Y EDITAR) ---
  const openModalForNewCategory = () => {
    setTargetCategory('') 
    setCustomItem({ id: '', name: '', price: '', category: '' })
    setShowCustomModal(true)
  }

  const openModalForCategory = (category: string) => {
    setTargetCategory(category)
    setCustomItem({ id: '', name: '', price: '', category: category })
    setShowCustomModal(true)
  }

  // NUEVO: Abrir modal para EDITAR un item existente
  const openModalForEdit = (item: any) => {
    setTargetCategory('') // Ocultamos los chips rápidos al editar
    setCustomItem({ 
      id: item.id, 
      name: item.name, 
      price: item.price.toString(), 
      category: item.category 
    })
    setShowCustomModal(true)
  }

  const saveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItem.name || !customItem.price || (!customItem.category && !targetCategory)) return alert("Llena todos los campos")
    
    setIsAdding(true)
    const finalCategory = targetCategory ? targetCategory : customItem.category.charAt(0).toUpperCase() + customItem.category.slice(1).toLowerCase()

    if (customItem.id) {
      // ESTAMOS EDITANDO
      const { data, error } = await supabase.from('menu_items').update({
        name: customItem.name,
        price: parseFloat(customItem.price),
        category: finalCategory
      }).eq('id', customItem.id).select().single()

      if (!error && data) {
        setMenuItems(prev => prev.map(item => item.id === customItem.id ? data : item))
        setShowCustomModal(false)
      }
    } else {
      // ESTAMOS CREANDO NUEVO
      const { data, error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurant.id,
        name: customItem.name,
        price: parseFloat(customItem.price),
        category: finalCategory,
        is_available: true
      }).select().single()

      if (!error && data) {
        setMenuItems(prev => [...prev, data])
        setShowCustomModal(false)
      }
    }
    setIsAdding(false)
  }

  const addTemplateToMenu = async (template: any) => {
    setIsAdding(true)
    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id, name: template.name, price: template.price, category: targetCategory || template.category, is_available: true
    }).select().single()
    if (!error && data) setMenuItems(prev => [...prev, data])
    setIsAdding(false); setShowCustomModal(false)
  }

  // --- ORDENAMIENTO INTELIGENTE DE CATEGORÍAS ---
  const getCategoryWeight = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('pupusa')) return 1;
    if (lower.includes('extra') || lower.includes('acompaña')) return 2;
    if (lower.includes('bebida')) return 3;
    if (lower.includes('postre')) return 4;
    return 5; // Categorías nuevas van al final
  }

  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)))
    .sort((a: any, b: any) => getCategoryWeight(a) - getCategoryWeight(b) || a.localeCompare(b))

  const isItemInMenu = (name: string) => menuItems.some(item => item.name.toLowerCase() === name.toLowerCase())
  const suggestedTemplates = targetCategory ? Object.values(MENU_TEMPLATES).flat().filter(t => t.category.toLowerCase() === targetCategory.toLowerCase()) : []

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando menú...</div>

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

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-8">
        
        {/* RENDERIZADO POR CATEGORÍAS (ORDENADAS) */}
        {uniqueCategories.map(category => {
          // Ordenar los items alfabéticamente dentro de la categoría
          const itemsInCategory = menuItems
            .filter(item => item.category === category)
            .sort((a, b) => a.name.localeCompare(b.name))
            
          const catNameStr = String(category);
          
          return (
            <div key={catNameStr} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-4 border-b-2 border-gray-100 pb-2 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  {catNameStr.toLowerCase().includes('pupusa') ? '🔥' : 
                   catNameStr.toLowerCase().includes('extra') ? '✨' : 
                   catNameStr.toLowerCase().includes('bebida') ? '🥤' : 
                   catNameStr.toLowerCase().includes('postre') ? '🍰' : '🍽️'}
                   {catNameStr}
                </span>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{itemsInCategory.length} items</span>
              </h2>

              <div className="space-y-3 mb-4">
                {itemsInCategory.map((item) => {
                  const hasPhotoUrl = item.image_url && (item.image_url.startsWith('/') || item.image_url.startsWith('http'));
                  const firstLetter = item.name.charAt(0).toUpperCase();

                  return (
                  <div key={item.id} className={`bg-gray-50 rounded-2xl border-l-4 transition-all ${item.is_available ? 'border-green-500' : 'border-gray-300 opacity-60'}`}>
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-1">
                          {/* FOTO O INICIAL */}
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden shadow-sm">
                            {hasPhotoUrl ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/>
                            ) : (
                              <span className="text-lg font-black text-orange-400">{firstLetter}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 pr-2">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
                          </div>
                        </div>

                        {/* ACCIONES */}
                        <div className="flex items-center gap-3">
                          {/* BOTÓN DE EDITAR ABRE EL MODAL AHORA */}
                          <button onClick={() => openModalForEdit(item)} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:border-orange-300 text-sm font-black text-gray-800 flex items-center gap-2 transition-colors">
                            <span>${item.price.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">✏️ Editar</span>
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer" title={item.is_available ? 'Desactivar' : 'Activar'}>
                            <input type="checkbox" className="sr-only peer" checked={item.is_available} onChange={() => toggleAvailability(item.id, item.is_available)}/>
                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                          <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-2 bg-gray-100 rounded-lg hover:bg-red-50 transition-colors" title="Borrar Producto">
                             🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* BOTÓN DINÁMICO DE AGREGAR */}
              <button 
                onClick={() => openModalForCategory(catNameStr)}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-500 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors text-sm"
              >
                + Agregar producto a {catNameStr}
              </button>
            </div>
          )
        })}

        {/* BOTÓN: NUEVA CATEGORÍA */}
        <button 
            onClick={openModalForNewCategory}
            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-black text-lg shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            <span>➕</span> CREAR NUEVA CATEGORÍA
        </button>

      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white shrink-0">
                <h3 className="text-xl font-black">
                  {customItem.id ? 'Editar Platillo' : (targetCategory ? `Agregar a ${targetCategory}` : 'Nueva Categoría')}
                </h3>
                <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                {/* MOSTRAR CHIPS SOLO SI ESTAMOS CREANDO (NO EDITANDO) */}
                {!customItem.id && targetCategory && suggestedTemplates.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Agregar Rápido</label>
                        <div className="flex flex-wrap gap-2">
                            {suggestedTemplates.map((template, idx) => {
                                const exists = isItemInMenu(template.name)
                                return (
                                <button
                                    key={idx} onClick={() => !exists && addTemplateToMenu(template)} disabled={exists || isAdding}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${exists ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:scale-95'}`}
                                >
                                    {template.name} {!exists && '+'}
                                </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* FORMULARIO MANUAL */}
                <form onSubmit={saveCustomItem} className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest -mb-2">
                      {customItem.id ? 'Modificar Datos' : 'Creación Manual'}
                    </label>
                    
                    {(!targetCategory || customItem.id) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de Categoría</label>
                            <input required type="text" list="categoriesList" value={customItem.category} onChange={e => setCustomItem({...customItem, category: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" placeholder="Ej: Desayunos, Pizzas..."/>
                            <datalist id="categoriesList">
                              {uniqueCategories.map(cat => <option key={cat as string} value={cat as string} />)}
                            </datalist>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Platillo</label>
                        <input required type="text" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" placeholder="Ej: Pizza Personal"/>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Precio ($)</label>
                        <input required type="number" step="0.01" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800" placeholder="3.50"/>
                    </div>

                    <button type="submit" disabled={isAdding} className="w-full bg-orange-600 text-white font-black text-lg py-4 rounded-xl hover:bg-orange-700 mt-4 disabled:opacity-50 shadow-lg active:scale-95 transition-all">
                        {customItem.id ? '💾 Guardar Cambios' : '➕ Agregar Platillo'}
                    </button>
                </form>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.2s ease-out; }
      `}</style>
    </div>
  )
}