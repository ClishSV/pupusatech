import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const mode = searchParams.get('mode') 

  // Por defecto (Si instalan desde la Landing Page o Dashboard)
  let appName = 'PupusaTech'
  let startUrl = '/'
  
  // Si instalan desde la URL de un restaurante
  if (slug) {
    if (mode === 'cliente') {
      appName = `Menú Local`
      startUrl = `/${slug}`
    } else if (mode === 'mesero') {
      appName = `Mesero POS`
      startUrl = `/${slug}/mesero`
    } else if (mode === 'cocina') {
      appName = `Cocina KDS`
      startUrl = `/${slug}/admin`
    } else if (mode === 'despacho') {
      appName = `Caja/Despacho`
      startUrl = `/${slug}/despacho`
    }
  }

  return NextResponse.json({
    name: appName,
    short_name: appName,
    description: "Sistema Inteligente de Gestión",
    start_url: startUrl,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/logo-solid.png", // 💡 AQUÍ USAMOS EL NUEVO LOGO CON FONDO BLANCO
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/logo-solid.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  })
}