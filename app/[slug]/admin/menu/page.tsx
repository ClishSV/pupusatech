"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ==========================================
// DICCIONARIO DE PLATILLOS (PLANTILLAS)
// ==========================================
const MENU_TEMPLATES = [
  { name: 'Pupusa de Queso', price: 0.80, icon: '🧀', category: 'pupusas' },
  { name: 'Pupusa Revuelta', price: 0.80, icon: '🥩', category: 'pupusas' },
  { name: 'Pupusa de Frijol con Queso', price: 0.75, icon: '🫘', category: 'pupusas' },
  { name: 'Pupusa de Loroco', price: 0.80, icon: '🌿', category: 'pupusas' },
  { name: 'Pupusa de Ayote', price: 0.75, icon: '🎃', category: 'pupusas' },
  { name: 'Pupusa de Ajo', price: 0.80, icon: '🧄', category: 'pupusas' },
  { name: 'Pupusa de Camarón', price: 1.25, icon: '🍤', category: 'pupusas' },
  { name: 'Pupusa Loca', price: 2.50, icon: '🤪', category: 'pupusas' },
  
  { name: 'Horchata', price: 1.00, icon: '🥛', category: 'bebidas' },
  { name: 'Fresco Natural', price: 1.00, icon: '🧃', category: 'bebidas' },
  { name: 'Coca Cola', price: 1.25, icon: '🥤', category: 'bebidas' },
  { name: 'Café', price: 0.75, icon: '☕', category: 'bebidas' },
  { name: 'Cerveza Pilsener', price: 2.00, icon: '🍺', category: 'bebidas' },
  
  { name: 'Porción de Curtido', price: 0.50, icon: '🥗', category: 'extras' },
  { name: 'Salsa Extra', price: 0.25, icon: '🍅', category: 'extras' },
  
  { name: 'Empanadas de Leche', price: 1.00, icon: '🥟', category: 'postres' },
  { name: 'Tres Leches', price: 2.00, icon: '🍰', category: 'postres' },
  { name: 'Plátano Frito', price: 1.00, icon: '🍌', category: 'postres' },
]

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
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'pupusas', icon: '🥘' })

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

  // Agregar desde Chip predefinido
  const addTemplateToMenu = async (template: any) => {
    setIsAdding(true)
    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id,
      name: template.name,
      price: template.price,
      category: template.category,
      image_url: template.icon,
      is_available: true
    }).select().single()

    if (!error && data) {
      setMenuItems(prev => [...prev, data])
    }
    setIsAdding(false)
  }

  // Agregar Personalizado
  const addCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id,
      name: customItem.name,
      price: parseFloat(customItem.price),
      category: customItem.category,
      image_url: customItem.icon,
      is_available: true
    }).select().single()

    if (!error && data) {
      setMenuItems(prev => [...prev, data])
      setShowCustomModal(false)
      setCustomItem({ name: '', price: '', category: 'pupusas', icon: '🥘' }) // Reset
    }
    setIsAdding(false)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-orange-500 font-bold">Cargando menú...</div>

  // VERIFICADOR DE ITEMS EXISTENTES (Para no duplicar chips)
  const isItemInMenu = (name: string) => menuItems.some(item => item.name === name)

  return (
    <div className="min-h-screen bg-gray-100 pb-32 font-sans">
      
      {/* HEADER */}
      <div className="bg-white shadow-md sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/${slug}/admin`} className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-all active:scale-95">
            ⬅️ Volver
          </Link>
          <div className="flex-1">
            <h1 className="font-black text-xl text-gray-900 tracking-tight">Constructor de Menú</h1>
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">{restaurant?.name}</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          PASO 1: CATÁLOGO EXPRESS (CHIPS)
          ========================================== */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">1. Agrega productos rápido 👇</h2>
          
          <div className="flex flex-wrap gap-2">
            {MENU_TEMPLATES.map((template, idx) => {
              const exists = isItemInMenu(template.name)
              return (
                <button
                  key={idx}
                  onClick={() => !exists && addTemplateToMenu(template)}
                  disabled={exists || isAdding}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all border-2 ${
                    exists 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                      : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-400 hover:scale-105 active:scale-95 shadow-sm'
                  }`}
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                  {!exists && <span className="text-orange-400 ml-1 text-xs">+</span>}
                </button>
              )
            })}
            
            {/* BOTÓN CREAR PERSONALIZADO */}
            <button
                onClick={() => setShowCustomModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-all border-2 bg-gray-900 text-white border-gray-900 hover:bg-black hover:scale-105 shadow-md"
            >
                <span>➕</span> Crear Personalizado
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          PASO 2: MI MENÚ ACTIVO (LISTA EDITABLE)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        
        {['pupusas', 'extras', 'bebidas', 'postres'].map(category => {
          const items = menuItems.filter(item => item.category === category)
          if (items.length === 0) return null

          return (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2 mb-4 uppercase border-b-2 border-gray-200 pb-2">
                {category === 'pupusas' && '🔥 Pupusas'}
                {category === 'extras' && '✨ Extras'}
                {category === 'bebidas' && '🥤 Bebidas'}
                {category === 'postres' && '🍰 Postres'}
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full ml-2">{items.length}</span>
              </h2>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className={`bg-white rounded-2xl shadow-sm border-l-4 transition-all ${item.is_available ? 'border-green-500' : 'border-gray-300 opacity-60'}`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          
                          {/* CONTENEDOR IMAGEN */}
                          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
                            {item.image_url && item.image_url.startsWith('/') ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/>
                            ) : (
                              <span className="text-2xl">{item.image_url || '🥘'}</span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>
                          </div>
                        </div>

                        {/* ACCIONES (SWITCH Y BASURERO) */}
                        <div className="flex items-center gap-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={item.is_available} onChange={() => toggleAvailability(item.id, item.is_available)}/>
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                          </label>
                          <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-50 rounded-lg">
                             🗑️
                          </button>
                        </div>
                      </div>

                      {/* EDITOR DE PRECIO */}
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-sm font-bold text-gray-500">Precio:</span>
                        
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">$</span>
                            <input 
                              type="number" step="0.05" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 p-2 border-2 border-orange-300 rounded-lg focus:outline-none text-right font-bold" autoFocus
                            />
                            <button onClick={() => savePrice(item.id)} className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold active:scale-95">OK</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(item)} className="flex items-center gap-2 group">
                            <span className="text-xl font-black text-gray-900 group-hover:text-orange-600 border-b border-dotted border-gray-400">${item.price.toFixed(2)}</span>
                            <span className="text-xs">✏️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {menuItems.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👆</div>
            <h3 className="text-xl font-bold text-gray-700">Tu menú está vacío</h3>
            <p className="text-gray-500">Toca los botones de arriba para empezar a agregar platillos.</p>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: CREAR ITEM PERSONALIZADO
          ========================================== */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-gray-900 p-5 text-white">
                <h3 className="text-xl font-black">Crear Platillo</h3>
            </div>
            
            <form onSubmit={addCustomItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                <input required type="text" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none" placeholder="Ej: Pizza Personal"/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
                  <input required type="number" step="0.01" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none" placeholder="1.50"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emoji / Ícono</label>
                  <input type="text" maxLength={2} value={customItem.icon} onChange={e => setCustomItem({...customItem, icon: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl text-center text-2xl focus:border-orange-500 outline-none" placeholder="🍕"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                <select value={customItem.category} onChange={e => setCustomItem({...customItem, category: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl font-bold focus:border-orange-500 outline-none bg-white">
                  <option value="pupusas">Pupusas / Plato Principal</option>
                  <option value="extras">Extras / Acompañamientos</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="postres">Postres</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCustomModal(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Cancelar</button>
                <button type="submit" disabled={isAdding} className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 disabled:opacity-50">Guardar</button>
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
      `}</style>
    </div>
  )
}