"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Smartphone, ChefHat, TrendingUp, Zap, DollarSign, Users, Menu, X, Bell } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 overflow-x-hidden">
      
      {/* ==========================================
          NAVBAR
          ========================================== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                🫓
              </div>
              <span className="font-black text-2xl tracking-tight">
                PUPUSA<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">TECH</span>
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold">
              <a href="#beneficios" className="text-gray-700 hover:text-orange-600 transition-colors">Beneficios</a>
              <a href="#demo" className="text-gray-700 hover:text-orange-600 transition-colors">Demo en Vivo</a>
              <a href="#precios" className="text-gray-700 hover:text-orange-600 transition-colors">Precios</a>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <a 
                href="https://wa.me/50373933442?text=Hola,%20me%20interesa%20digitalizar%20mi%20pupusería" 
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span>Agendar Cita</span>
                <ChevronRight size={16} />
              </a>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in">
            <div className="px-4 py-6 space-y-4">
              <a href="#beneficios" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 font-semibold hover:text-orange-600 transition-colors py-2">Beneficios</a>
              <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 font-semibold hover:text-orange-600 transition-colors py-2">Demo en Vivo</a>
              <a href="#precios" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 font-semibold hover:text-orange-600 transition-colors py-2">Precios</a>
              <a 
                href="https://wa.me/50373933442" 
                className="block bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl text-center font-bold"
              >
                Agendar Cita
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ==========================================
          HERO SECTION
          ========================================== */}
      <header className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-50 via-white to-red-50"></div>
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-200 to-red-200 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-200 to-orange-200 rounded-full filter blur-3xl opacity-20"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white border border-orange-200 shadow-sm px-4 py-2 rounded-full text-sm font-bold mb-8 text-orange-700">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                Disponible para todo El Salvador 🇸🇻
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight">
                El fin de las órdenes{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 animate-gradient">
                  en papel manchado
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Moderniza tu pupusería con un sistema digital súper fácil de usar. 
                Tus clientes piden desde el celular, la cocina recibe al instante y tú controlas todo.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  href="/labendicion"
                  className="group flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300"
                >
                  <span>Probar Demo Gratis</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a 
                  href="#demo" 
                  className="flex items-center justify-center gap-2 bg-white text-gray-900 border-2 border-gray-300 px-8 py-4 rounded-2xl font-bold text-lg hover:border-orange-500 hover:text-orange-600 transition-all duration-300 shadow-lg"
                >
                  <span>▶</span> Ver cómo funciona
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>Sin tarjetas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>Setup en 15 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  <span>Soporte 24/7</span>
                </div>
              </div>
            </div>

            {/* Right Column - TELÉFONO CON CAPTURA REAL */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
              
              <div className="relative z-10 transform hover:scale-105 transition-transform duration-500">
                
                {/* NOTIFICACIÓN FLOTANTE (ESTILO CAPTURA) */}
                <div className="absolute top-24 -right-8 sm:-right-12 bg-white p-3 rounded-2xl shadow-xl animate-bounce-slow flex items-center gap-3 border border-gray-100 z-30 max-w-[200px]">
                  <div className="bg-green-100 p-2 rounded-full shrink-0">
                    <Bell className="text-green-600 w-5 h-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Nueva Orden</p>
                    <p className="text-sm font-bold text-gray-900">Mesa 4 • $12.50</p>
                  </div>
                </div>

                {/* MARCO DEL TELÉFONO */}
                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-8 border-gray-900 w-[280px] sm:w-[300px] aspect-[9/19]">
                  
                  {/* PANTALLA INTERNA */}
                  <div className="bg-white rounded-[2.5rem] h-full w-full overflow-hidden relative">
                    
                    {/* --- AQUÍ CARGA LA IMAGEN DE 'public/captura.png' --- */}
                    <img 
                      src="/captura.png" 
                      alt="PupusaTech App Demo"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        // Si falla, muestra el esqueleto
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    
                    {/* Mockup de respaldo (Skeleton) */}
                    <div className="hidden w-full h-full bg-gray-50 flex-col">
                      <div className="h-24 bg-gradient-to-r from-orange-500 to-red-500 w-full shrink-0"></div>
                      <div className="p-4 space-y-4 flex-1">
                        <div className="h-24 bg-white rounded-2xl shadow-sm w-full"></div>
                        <div className="h-24 bg-white rounded-2xl shadow-sm w-full"></div>
                        <div className="h-24 bg-white rounded-2xl shadow-sm w-full"></div>
                      </div>
                    </div>

                  </div>

                  {/* Notch del iPhone */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-gray-900 rounded-b-2xl z-20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- CARACTERÍSTICAS --- */}
      <section id="beneficios" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6 tracking-tight">
              Todo lo que necesitas
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Diseñado específicamente para la forma de trabajar de las pupuserías salvadoreñas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Smartphone, color: 'orange', title: 'Menú QR', desc: 'Tus clientes escanean y piden. Sin bajar apps.' },
              { icon: ChefHat, color: 'blue', title: 'Pantalla Cocina', desc: 'Los pedidos llegan directo a una tablet con sonido.' },
              { icon: TrendingUp, color: 'green', title: 'Control Total', desc: 'Cambia precios y apaga productos al instante.' },
              { icon: Zap, color: 'yellow', title: 'Súper Rápido', desc: 'Reduce el tiempo de espera en un 40%.' },
              { icon: DollarSign, color: 'emerald', title: 'Sin Comisiones', desc: 'No cobramos porcentaje por venta.' },
              { icon: Users, color: 'purple', title: 'Soporte Local', desc: 'Te atendemos por WhatsApp de inmediato.' }
            ].map((feature, index) => (
              <div key={index} className="group p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 bg-${feature.color}-100 text-${feature.color}-600 rounded-2xl flex items-center justify-center mb-6 text-orange-600`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          DEMO CTA
          ========================================== */}
      <section id="demo" className="py-24 relative overflow-hidden bg-gray-900">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-500 to-red-500 rounded-full filter blur-[120px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Pruébalo tú mismo ahora
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Hemos creado una pupusería ficticia &apos;La Bendición&apos;. Entra y haz un pedido real.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link href="/labendicion" className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition group">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-2xl font-black text-white mb-2">Ver como Cliente</h3>
              <p className="text-gray-300">Escanea, pide y disfruta.</p>
            </Link>
            <Link href="/labendicion/admin" className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition group">
              <div className="text-4xl mb-4">👨‍🍳</div>
              <h3 className="text-2xl font-black text-white mb-2">Ver como Dueño</h3>
              <p className="text-gray-300">Recibe órdenes y cocina.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ==========================================
          PRECIOS (ESTILO IDÉNTICO A CAPTURA)
          ========================================== */}
      <section id="precios" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Precios Claros</h2>
          <p className="text-xl text-gray-600 font-medium">
            Sin comisiones por venta. Solo una tarifa plana justa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
          
          {/* Plan Emprendedor */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col hover:shadow-lg transition-all">
            <h3 className="text-xl font-bold text-gray-600 mb-2">Plan Emprendedor</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-gray-900">$15</span>
              <span className="text-lg text-gray-400 font-medium">/mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 text-gray-600 flex-1 text-left">
              <li className="flex gap-3 items-center"><Check size={18} className="text-green-500"/> Menú Digital QR</li>
              <li className="flex gap-3 items-center"><Check size={18} className="text-green-500"/> Pedidos ilimitados</li>
              <li className="flex gap-3 items-center"><Check size={18} className="text-green-500"/> Soporte por WhatsApp</li>
            </ul>
            
            <a href="https://wa.me/50373933442" className="block w-full bg-gray-100 text-gray-900 font-bold py-3 rounded-xl text-center hover:bg-gray-200 transition">
              Consultar
            </a>
          </div>

          {/* Plan Negocio Pro (Destacado) */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-500 relative flex flex-col transform md:scale-105 z-10">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wider">
              MÁS POPULAR
            </div>
            
            <h3 className="text-xl font-bold text-orange-600 mb-2">Plan Negocio Pro</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-gray-900">$25</span>
              <span className="text-lg text-gray-400 font-medium">/mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 text-gray-700 flex-1 text-left">
              <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500"/> Todo lo del Plan Básico</li>
              <li className="flex gap-3 items-center font-bold"><Check size={18} className="text-orange-500"/> Pantalla de Cocina (KDS)</li>
              <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500"/> Impresión de Tickets</li>
              <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500"/> Reportes de Ventas</li>
            </ul>
            
            <a href="https://wa.me/50373933442" className="block w-full bg-[#EA580C] text-white font-bold py-3 rounded-xl text-center hover:bg-orange-700 transition shadow-lg">
              Empezar Ahora
            </a>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} PupusaTech. Hecho con ❤️ en El Salvador 🇸🇻</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-slow {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}