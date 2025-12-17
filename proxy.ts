import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// NOTA: Antes se llamaba 'middleware', ahora la función exportada debe llamarse 'proxy'
export async function proxy(request: NextRequest) {
  // 1. Configuración de respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Cliente de Supabase (Igual que antes, la lógica de auth no cambia)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Verificar usuario
  const { data: { user } } = await supabase.auth.getUser()

  // ============================================================
  // 🛡️ REGLAS DE SEGURIDAD (Las mismas de nuestro plan)
  // ============================================================
  
  const path = request.nextUrl.pathname

  // A. EXCEPCIÓN VIP: Permitir siempre el acceso a la demo "La Bendición"
  if (path.includes('/labendicion')) {
    return response
  }

  // B. REGLA GENERAL: Proteger todas las rutas "/admin"
  // Si intenta entrar a cualquierya/admin y NO tiene usuario...
  if (path.includes('/admin') && !user) {
    // Redirigir al login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

// Configuración del Matcher (Igual que antes)
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto estáticos, imágenes, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}