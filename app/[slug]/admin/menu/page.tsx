"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase' // Retrocedemos 4 niveles
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MenuManagerPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [restaurant, setRestaurant] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estado para saber qué item se está editando (precio)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState<string>('')

  // 1. CARGAR DATOS
  useEffect(() => {
    async function fetchData() {
      if (!slug) return

      // Datos del restaurante
      const { data: restData } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
      if (!restData) return
      setRestaurant(restData)

      // Cargar TODO el menú (incluso lo no disponible)
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restData.id)
        .order('category', { ascending: false }) // Pupusas primero, luego bebidas
        .order('name', { ascending: true })

      if (menuData) setMenuItems(menuData)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // 2. CAMBIAR DISPONIBILIDAD (SWITCH)
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    // Optimismo en UI
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    
    // Guardar en DB
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

    // Optimismo en UI
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item))
    setEditingId(null)

    // Guardar en DB
    await supabase.from('menu_items').update({ price: newPrice }).eq('id', id)
  }

  if (loading) return <div className="p-10 text-center text-orange-500">Cargando menú... ⚙️</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER SIMPLE */}
      <div className="bg-white shadow-sm p-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href={`/${slug}/admin`} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
          ⬅️
        </Link>
        <div>
          <h1 className="font-bold text-xl text-gray-800">Gestionar Menú</h1>
          <p className="text-xs text-gray-500">{restaurant?.name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* LISTA DE ITEMS */}
        {menuItems.map((item) => (
          <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 transition-all ${item.is_available ? 'border-green-500 opacity-100' : 'border-gray-300 opacity-75 grayscale-[0.5]'}`}>
            
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{item.image_url}</span>
                <div>
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <span className="text-xs uppercase font-bold tracking-wide text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* SWITCH DISPONIBILIDAD */}
              <div className="flex flex-col items-end">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={item.is_available}
                    onChange={() => toggleAvailability(item.id, item.is_available)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <span className="text-[10px] font-bold mt-1 text-gray-400">
                  {item.is_available ? 'DISPONIBLE' : 'AGOTADO'}
                </span>
              </div>
            </div>

            {/* SECCIÓN DE PRECIO */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-sm font-bold text-gray-500">Precio Unitario:</span>
              
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input 
                    type="number" 
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    className="w-20 p-1 border border-orange-300 rounded focus:outline-none text-right font-bold"
                    autoFocus
                  />
                  <button onClick={() => savePrice(item.id)} className="bg-green-500 text-white p-1 px-2 rounded text-xs font-bold">OK</button>
                  <button onClick={() => setEditingId(null)} className="text-red-400 text-xs px-2">X</button>
                </div>
              ) : (
                <div className="flex items-center gap-2" onClick={() => startEditing(item)}>
                  <span className="text-xl font-bold text-gray-800 cursor-pointer hover:text-orange-600 border-b border-dotted border-gray-400">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400">✏️</span>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}