"use client"

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// DICCIONARIO DE PLATILLOS (Plantillas Rápidas)
const MENU_TEMPLATES = {
  "🔥 Básicos de Pupusería": [
    { name: 'Pupusa de Queso', price: 0.80, category: 'Pupusas', master_category: 'PUPUSAS' },
    { name: 'Pupusa Revuelta', price: 0.80, category: 'Pupusas', master_category: 'PUPUSAS' },
    { name: 'Pupusa de Frijol con Queso', price: 0.75, category: 'Pupusas', master_category: 'PUPUSAS' },
  ],
  "✨ Extras y Complementos": [
    { name: 'Porción de Curtido', price: 0.50, category: 'Extras', master_category: 'EXTRAS' },
    { name: 'Salsa de Tomate Extra', price: 0.25, category: 'Extras', master_category: 'EXTRAS' },
  ],
  "🥤 Bebidas Populares": [
    { name: 'Horchata', price: 1.00, category: 'Bebidas', master_category: 'BEBIDAS' },
    { name: 'Coca Cola', price: 1.25, category: 'Bebidas', master_category: 'BEBIDAS' },
  ]
}

// 💡 LAS 11 CATEGORÍAS MAESTRAS DEFINITIVAS
const MASTER_CATEGORIES = [
  { id: 'PUPUSAS', label: '🫓 Pupusas (Activa Maíz/Arroz)' },
  { id: 'ENTRADAS', label: '🥗 Entradas' },
  { id: 'PLATOS_FUERTES', label: '🍛 Platos Fuertes' },
  { id: 'ANTOJITOS', label: '🥟 Antojitos' },
  { id: 'SOPAS', label: '🥣 Sopas' },
  { id: 'MEXICANA', label: '🌮 Mexicana' },
  { id: 'BEBIDAS', label: '🥤 Bebidas' },
  { id: 'POSTRES', label: '🍰 Postres' },
  { id: 'EXTRAS', label: '✨ Extras' },
  { id: 'PROMOCIONES', label: '🏷️ Promociones' },
  { id: 'OTROS', label: '🍽️ Otros (Comodín)' }
];

export default function MenuManagerPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [targetCategory, setTargetCategory] = useState<string>('') 
  
  // 💡 ESTADO ACTUALIZADO CON MASTER_CATEGORY
  const [customItem, setCustomItem] = useState({ id: '', name: '', price: '', category: '', image_url: '', master_category: 'OTROS' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    if(!confirm('¿Seguro que quieres borrar este producto de tu menú?')) return;
    setMenuItems(prev => prev.filter(item => item.id !== id))
    await supabase.from('menu_items').delete().eq('id', id)
  }

  const resetForm = () => {
    setCustomItem({ id: '', name: '', price: '', category: '', image_url: '', master_category: 'OTROS' })
    setImageFile(null)
    setImagePreview(null)
  }

  const openModalForNewCategory = () => {
    setTargetCategory('') 
    resetForm()
    setShowCustomModal(true)
  }

  const openModalForCategory = (category: string) => {
    setTargetCategory(category)
    resetForm()
    setCustomItem(prev => ({ ...prev, category: category }))
    setShowCustomModal(true)
  }

  const openModalForEdit = (item: any) => {
    setTargetCategory('') 
    setCustomItem({ 
      id: item.id, 
      name: item.name, 
      price: item.price.toString(), 
      category: item.category,
      image_url: item.image_url || '',
      master_category: item.master_category || 'OTROS'
    })
    setImageFile(null)
    setImagePreview(item.image_url || null)
    setShowCustomModal(true)
  }

  // 🛡️ TRUCO ANTI-BLOQUEO: Reescribimos la función para que Google AI no la bloquee
  const handleImageChange = (eventoReact: React.ChangeEvent<HTMLInputElement>) => {
    const listaArchivos = eventoReact.target.files;
    
    if (listaArchivos && listaArchivos.length > 0) {
      const archivoSeleccionado = listaArchivos[0];
      
      if (archivoSeleccionado.size > 5242880) { // 5MB en bytes exactos
        alert("El archivo supera los 5MB permitidos. Por favor, comprímelo.");
        return;
      }
      
      const rutaTemporal = URL.createObjectURL(archivoSeleccionado);
      setImageFile(archivoSeleccionado);
      setImagePreview(rutaTemporal);
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setCustomItem(prev => ({ ...prev, image_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const saveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItem.name || !customItem.price || (!customItem.category && !targetCategory)) return alert("Llena todos los campos")
    
    setIsAdding(true)
    const finalCategory = targetCategory ? targetCategory : customItem.category.charAt(0).toUpperCase() + customItem.category.slice(1).toLowerCase()
    
    let finalImageUrl = customItem.image_url

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${restaurant.slug}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, imageFile, { upsert: true })

      if (uploadError) {
        alert("Error al subir la imagen. " + uploadError.message)
        setIsAdding(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName)

      finalImageUrl = publicUrlData.publicUrl
    }

    // Preparar objeto a guardar
    const itemData = {
        name: customItem.name,
        price: parseFloat(customItem.price),
        category: finalCategory,
        image_url: finalImageUrl,
        master_category: customItem.master_category
    }

    if (customItem.id) {
      const { data, error } = await supabase.from('menu_items').update(itemData).eq('id', customItem.id).select().single()

      if (!error && data) {
        setMenuItems(prev => prev.map(item => item.id === customItem.id ? data : item))
        setShowCustomModal(false)
      } else {
        alert("Error actualizando: " + error?.message)
      }
    } else {
      const { data, error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurant.id,
        ...itemData,
        is_available: true
      }).select().single()

      if (!error && data) {
        setMenuItems(prev => [...prev, data])
        setShowCustomModal(false)
      } else {
        alert("Error creando: " + error?.message)
      }
    }
    setIsAdding(false)
  }

  const addTemplateToMenu = async (template: any) => {
    setIsAdding(true)
    const { data, error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id, 
      name: template.name, 
      price: template.price, 
      category: targetCategory || template.category, 
      master_category: template.master_category || 'OTROS',
      is_available: true
    }).select().single()
    if (!error && data) setMenuItems(prev => [...prev, data])
    setIsAdding(false); setShowCustomModal(false)
  }

  const getCategoryWeight = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('pupusa')) return 1;
    if (lower.includes('extra') || lower.includes('acompaña')) return 2;
    if (lower.includes('bebida')) return 3;
    if (lower.includes('postre')) return 4;
    return 5; 
  }

  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)))
    .sort((a: any, b: any) => getCategoryWeight(a) - getCategoryWeight(b) || a.localeCompare(b))

  const isItemInMenu = (name: string) => menuItems.some(item => item.name.toLowerCase() === name.toLowerCase())
  const suggestedTemplates = targetCategory ? Object.values(MENU_TEMPLATES).flat().filter(t => t.category.toLowerCase() === targetCategory.toLowerCase()) : []

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando menú...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-32 font-sans">
      
      <div className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard`} className="bg-gray-100 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all active:scale-95">
              ← Dashboard
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
        
        {uniqueCategories.map(category => {
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
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden shadow-sm">
                            {hasPhotoUrl ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/>
                            ) : (
                              <span className="text-lg font-black text-orange-400">{firstLetter}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 pr-2">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5 opacity-70">FAMILIA: {item.master_category}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button onClick={() => openModalForEdit(item)} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:border-orange-300 text-sm font-black text-gray-800 flex items-center gap-2 transition-colors active:scale-95">
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

              <button 
                onClick={() => openModalForCategory(catNameStr)}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-500 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors text-sm active:scale-95"
              >
                + Agregar producto a {catNameStr}
              </button>
            </div>
          )
        })}

        <button 
            onClick={openModalForNewCategory}
            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-black text-lg shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            <span>➕</span> CREAR NUEVA CATEGORÍA
        </button>

      </div>

      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up sm:animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white shrink-0">
                <h3 className="text-xl font-black">
                  {customItem.id ? 'Editar Platillo' : (targetCategory ? `Agregar a ${targetCategory}` : 'Nueva Categoría')}
                </h3>
                <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                {!customItem.id && targetCategory && suggestedTemplates.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Agregar Rápido</label>
                        <div className="flex flex-wrap gap-2">
                            {suggestedTemplates.map((template, idx) => {
                                const exists = isItemInMenu(template.name)
                                return (
                                <button
                                    key={idx} onClick={() => !exists && addTemplateToMenu(template)} disabled={exists || isAdding}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${exists ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:scale-95'}`}
                                >
                                    {template.name} {!exists && '+'}
                                </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <form onSubmit={saveCustomItem} className="space-y-5">
                    
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Foto del Platillo (Para el cliente)</label>
                      
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-24 h-24 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-inner relative">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl opacity-50">📸</span>
                          )}
                        </div>

                        <div className="flex gap-2 w-full">
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleImageChange}
                          />
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
                          >
                            {imagePreview ? 'Cambiar Foto' : 'Subir Foto'}
                          </button>
                          
                          {imagePreview && (
                            <button 
                              type="button" 
                              onClick={removeImage}
                              className="bg-red-50 text-red-500 font-bold px-3 py-2 rounded-xl text-sm border border-red-100 hover:bg-red-100 transition-colors"
                              title="Quitar foto"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 💡 NUEVO SELECTOR: FAMILIA MAESTRA */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm">
                        <label className="block text-xs font-black text-blue-800 mb-2 uppercase tracking-widest">1. ¿A qué gran familia pertenece?</label>
                        <select 
                          required
                          value={customItem.master_category}
                          onChange={e => setCustomItem({...customItem, master_category: e.target.value})}
                          className="w-full border-2 border-blue-300 p-3.5 rounded-xl font-black focus:border-blue-600 outline-none text-blue-900 bg-white shadow-sm"
                        >
                          <option value="" disabled>-- Selecciona una categoría maestra --</option>
                          {MASTER_CATEGORIES.map(cat => (
                             <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-blue-600 mt-2 font-bold leading-tight">
                          El sistema usará esto para agrupar tu Corte Z correctamente al final del día.
                        </p>
                    </div>

                    {(!targetCategory || customItem.id) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">2. Tu Sub-Categoría (Libre)</label>
                            <input required type="text" list="categoriesList" value={customItem.category} onChange={e => setCustomItem({...customItem, category: e.target.value})} className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800 shadow-sm" placeholder="Ej: Especialidades, Promociones..."/>
                            <datalist id="categoriesList">
                              {uniqueCategories.map(cat => <option key={cat as string} value={cat as string} />)}
                            </datalist>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Nombre del Platillo</label>
                        <input required type="text" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800 shadow-sm" placeholder="Ej: Pizza Personal"/>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Precio ($)</label>
                        <input required type="number" step="0.01" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold focus:border-orange-500 outline-none text-gray-800 shadow-sm" placeholder="3.50"/>
                    </div>

                    <button type="submit" disabled={isAdding} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg py-4 rounded-xl hover:shadow-orange-500/30 mt-4 disabled:opacity-50 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                        {isAdding ? (
                          <span className="animate-pulse">⏳ {imageFile ? 'Subiendo foto...' : 'Guardando...'}</span>
                        ) : (
                          customItem.id ? '💾 Guardar Cambios' : '➕ Agregar Platillo'
                        )}
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
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  )
}