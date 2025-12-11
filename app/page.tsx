import Link from 'next/link'
// CORRECCIÓN: Eliminé ShieldCheck que no se usaba
import { Check, ChevronRight, Smartphone, ChefHat, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🫓</span>
            <span className="font-extrabold text-xl tracking-tight text-gray-900">PUPUSA<span className="text-orange-600">TECH</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#beneficios" className="hover:text-orange-600 transition">Beneficios</a>
            <a href="#demo" className="hover:text-orange-600 transition">Demo en Vivo</a>
            <a href="#precios" className="hover:text-orange-600 transition">Precios</a>
          </div>
          <a 
            href="https://wa.me/503XXXXXXXX?text=Hola,%20me%20interesa%20digitalizar%20mi%20pupusería" 
            target="_blank"
            className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-orange-600 transition shadow-lg"
          >
            Agendar Cita
          </a>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 left-0 w-full h-full bg-orange-50 -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-orange-100/50 to-transparent rounded-bl-full opacity-60"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-6 border border-orange-200">
              <span className="animate-pulse">🔥</span> Disponible para todo El Salvador
            </div>
            <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6 text-gray-900">
              El fin de las órdenes <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">en papel manchado.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
              Moderniza tu pupusería con un sistema digital fácil de usar. 
              Tus clientes piden desde el celular, la cocina recibe la orden al instante y tú controlas todo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/labendicion" 
                className="flex items-center justify-center gap-2 bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-orange-700 hover:-translate-y-1 transition-all"
              >
                Probar Demo Gratis <ChevronRight size={20} />
              </Link>
              <a 
                href="#video" 
                className="flex items-center justify-center gap-2 bg-white text-gray-700 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-400 transition"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">⚡ No requiere tarjetas de crédito • Instalación rápida</p>
          </div>

          {/* Imagen Hero (Simulación de la App) */}
          <div className="relative">
            <div className="relative z-10 bg-white rounded-[2.5rem] border-8 border-gray-900 shadow-2xl overflow-hidden aspect-[9/19] max-w-[300px] mx-auto transform rotate-[-3deg] hover:rotate-0 transition duration-500">
              {/* Aquí iría una captura real de tu app */}
              <div className="h-full w-full bg-gray-100 flex flex-col">
                <div className="h-20 bg-gradient-to-r from-orange-500 to-red-500"></div>
                <div className="p-4 space-y-3">
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                </div>
                <div className="mt-auto bg-white p-4 border-t">
                  <div className="h-12 bg-orange-600 rounded-xl"></div>
                </div>
              </div>
            </div>
            
            {/* Elementos flotantes decorativos */}
            <div className="absolute top-20 -right-10 bg-white p-4 rounded-2xl shadow-xl animate-bounce-slow hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">🔔</div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">Nueva Orden</p>
                  <p className="text-sm font-bold">Mesa 4 • $12.50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- CARACTERÍSTICAS --- */}
      <section id="beneficios" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Todo lo que necesitas para crecer</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Diseñado específicamente para la forma de trabajar de las pupuserías salvadoreñas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-gray-50 hover:bg-orange-50 transition border border-gray-100 hover:border-orange-100">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                <Smartphone />
              </div>
              <h3 className="text-xl font-bold mb-3">Menú QR sin descargas</h3>
              <p className="text-gray-600 leading-relaxed">
                Tus clientes escanean y piden. Sin bajar apps, sin registrarse. Rápido y sencillo para que la mesa rote más rápido.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-50 hover:bg-orange-50 transition border border-gray-100 hover:border-orange-100">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                <ChefHat />
              </div>
              <h3 className="text-xl font-bold mb-3">Pantalla de Cocina</h3>
              <p className="text-gray-600 leading-relaxed">
                Adiós a los gritos. Los pedidos llegan directo a una tablet en la cocina con sonido de alerta. Nada se pierde.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-50 hover:bg-orange-50 transition border border-gray-100 hover:border-orange-100">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                <TrendingUp />
              </div>
              <h3 className="text-xl font-bold mb-3">Control Total</h3>
              <p className="text-gray-600 leading-relaxed">
                Cambia precios en segundos, apaga productos agotados y mira cuánto vendiste al final del día.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- DEMO CTA --- */}
      <section id="demo" className="py-20 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-black mb-6">Pruébalo tú mismo ahora</h2>
          <p className="text-xl text-gray-300 mb-10">
            {/* CORRECCIÓN: Usamos comillas simples para evitar el error de React */}
            Hemos creado una pupusería ficticia &apos;La Bendición&apos; para que veas el sistema en acción.
            Entra, haz un pedido y mira cómo funciona.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/labendicion" 
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              Ver Menú (Cliente) 📱
            </Link>
            <Link 
              href="/labendicion/admin" 
              className="bg-transparent border-2 border-gray-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:border-white hover:bg-white/10 transition"
            >
              Ver Cocina (Dueño) 👨‍🍳
            </Link>
          </div>
        </div>
      </section>

      {/* --- PRECIOS --- */}
      <section id="precios" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Precios Transparentes</h2>
            <p className="text-gray-500">Sin comisiones por venta. Solo una tarifa plana justa.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PLAN BÁSICO */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-500 mb-2">Plan Emprendedor</h3>
              <div className="text-4xl font-black text-gray-900 mb-6">$15<span className="text-lg text-gray-400 font-medium">/mes</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-gray-600"><Check size={20} className="text-green-500"/> Menú Digital QR</li>
                <li className="flex items-center gap-3 text-gray-600"><Check size={20} className="text-green-500"/> Pedidos ilimitados</li>
                <li className="flex items-center gap-3 text-gray-600"><Check size={20} className="text-green-500"/> Soporte por WhatsApp</li>
              </ul>
              <a href="https://wa.me/503XXXXXXXX" className="block w-full bg-gray-100 text-gray-900 font-bold py-3 rounded-xl text-center hover:bg-gray-200 transition">
                Consultar
              </a>
            </div>

            {/* PLAN PRO */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-500 relative">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                MÁS POPULAR
              </div>
              <h3 className="text-xl font-bold text-orange-600 mb-2">Plan Negocio Pro</h3>
              <div className="text-4xl font-black text-gray-900 mb-6">$25<span className="text-lg text-gray-400 font-medium">/mes</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-orange-500"/> Todo lo del Plan Básico</li>
                <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-orange-500"/> <strong>Pantalla de Cocina (KDS)</strong></li>
                <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-orange-500"/> Impresión de Tickets</li>
                <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-orange-500"/> Reportes de Ventas</li>
              </ul>
              <a href="https://wa.me/503XXXXXXXX" className="block w-full bg-orange-600 text-white font-bold py-3 rounded-xl text-center hover:bg-orange-700 transition shadow-lg">
                Empezar Ahora
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-bold text-white text-xl">PUPUSA<span className="text-orange-600">TECH</span></span>
            <p className="text-sm mt-2">Tecnología con sabor salvadoreño 🇸🇻</p>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} PupusaTech. Todos los derechos reservados.
          </div>
        </div>
      </footer>

     
    </div>
  )
}