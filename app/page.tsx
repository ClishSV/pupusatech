"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, Smartphone, ChefHat, TrendingUp, Zap, DollarSign, Users, Menu, X, Bell, Sparkles, Star } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 overflow-x-hidden">
      
      {/* NAVBAR PREMIUM */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/98 backdrop-blur-2xl shadow-2xl shadow-orange-500/5 border-b border-orange-100' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo con Imagen Real */}
            <div className="flex items-center gap-3 group cursor-pointer">
              {/* Versión Móvil (Solo ícono) */}
              <img 
                src="/logo-icon.png" 
                alt="PupusaTech Logo" 
                className="h-10 w-auto lg:hidden group-hover:scale-110 transition-transform" 
              />
              
              {/* Versión Escritorio (Logo Completo) */}
              <img 
                src="/logo-full.png" 
                alt="PupusaTech Logo Completo" 
                className="hidden lg:block h-12 w-auto group-hover:opacity-90 transition-opacity" 
              />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-bold">
              <a href="#beneficios" onClick={(e) => handleNavClick(e, '#beneficios')} className="text-gray-700 hover:text-orange-600 transition-all duration-300 hover:scale-105">Beneficios</a>
              <a href="#demo" onClick={(e) => handleNavClick(e, '#demo')} className="text-gray-700 hover:text-orange-600 transition-all duration-300 hover:scale-105">Demo</a>
              <a href="#precios" onClick={(e) => handleNavClick(e, '#precios')} className="text-gray-700 hover:text-orange-600 transition-all duration-300 hover:scale-105">Precios</a>
              <a href="/login" className="text-gray-900 hover:text-orange-600 transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <Users size={16} /> Soy Cliente
              </a>
            </div>

            <div className="flex items-center gap-4">
              <a 
                href="https://wa.me/50373933442?text=Hola..." 
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:from-orange-700 hover:to-red-700 transition-all duration-300 shadow-xl hover:shadow-orange-500/50 hover:scale-105 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                <span className="relative">Agendar Cita</span>
                <ChevronRight size={16} className="relative group-hover:translate-x-1 transition-transform" />
              </a>

              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-all duration-300"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/98 backdrop-blur-2xl border-t border-gray-100 shadow-2xl">
            <div className="px-4 py-6 space-y-4">
              <a href="#beneficios" onClick={(e) => handleNavClick(e, '#beneficios')} className="block text-gray-700 font-semibold hover:text-orange-600 hover:translate-x-2 transition-all duration-300 py-2">Beneficios</a>
              <a href="#demo" onClick={(e) => handleNavClick(e, '#demo')} className="block text-gray-700 font-semibold hover:text-orange-600 hover:translate-x-2 transition-all duration-300 py-2">Demo</a>
              <a href="#precios" onClick={(e) => handleNavClick(e, '#precios')} className="block text-gray-700 font-semibold hover:text-orange-600 hover:translate-x-2 transition-all duration-300 py-2">Precios</a>
              <a href="/login" className="block text-gray-900 font-bold hover:text-orange-600 hover:translate-x-2 transition-all duration-300 py-2 flex items-center gap-2">
                <Users size={16} /> Soy Cliente
              </a>
              <a href="https://wa.me/50373933442" className="block bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl text-center font-bold shadow-lg hover:scale-105 transition-all duration-300">
                Agendar Cita
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION PREMIUM */}
      <header className="relative pt-32 pb-24 lg:pt-40 lg:pb-40 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-300 to-red-300 rounded-full blur-[150px] opacity-30 animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-yellow-300 to-orange-300 rounded-full blur-[150px] opacity-25 animate-blob-delayed"></div>
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-300 to-red-300 rounded-full blur-[150px] opacity-20 animate-blob-more-delayed"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-orange-200 shadow-lg px-5 py-2.5 rounded-full text-sm font-bold mb-8 text-orange-700 animate-fade-in-up hover:scale-105 transition-transform duration-300">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                Disponible para todo El Salvador 🇸🇻
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                El fin de las órdenes{' '}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 animate-gradient-x">
                    en papel manchado
                  </span>
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-orange-400/30 via-red-400/30 to-pink-400/30 blur-lg"></span>
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                Moderniza tu pupusería con un sistema digital <span className="font-bold text-orange-600">súper fácil de usar</span>. 
                Tus clientes piden desde el celular, la cocina recibe al instante y tú controlas todo.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <a
                  href="/labendicion"
                  className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                  <Sparkles size={20} className="animate-pulse-subtle" />
                  <span className="relative">Probar Demo Gratis</span>
                  <ChevronRight size={20} className="relative group-hover:translate-x-1 transition-transform" />
                </a>
                
                <a 
                  href="#demo" 
                  onClick={(e) => handleNavClick(e, '#demo')}
                  className="group flex items-center justify-center gap-2 bg-white text-gray-900 border-2 border-gray-200 px-8 py-5 rounded-2xl font-bold text-lg hover:border-orange-500 hover:text-orange-600 hover:shadow-xl transition-all duration-300"
                >
                  <span className="text-orange-500 group-hover:scale-110 transition-transform">▶</span> 
                  Ver cómo funciona
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <div className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300">
                  <Check size={18} className="text-green-500" />
                  <span className="font-semibold">Sin tarjetas</span>
                </div>
                <div className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300">
                  <Check size={18} className="text-green-500" />
                  <span className="font-semibold">Setup en 15 min</span>
                </div>
                <div className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300">
                  <Check size={18} className="text-green-500" />
                  <span className="font-semibold">Soporte 24/7</span>
                </div>
              </div>
            </div>

            {/* TELÉFONO PREMIUM */}
            <div className="relative flex justify-center lg:justify-end animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/40 to-red-400/40 rounded-full blur-[100px] animate-pulse-slow"></div>
              
              <div className="relative z-10 transform hover:scale-105 hover:rotate-2 transition-all duration-700">
                
                <div className="absolute top-24 -right-8 sm:-right-12 bg-white p-4 rounded-2xl shadow-2xl animate-float flex items-center gap-3 border-2 border-green-100 z-30 max-w-[220px] hover:scale-110 transition-transform duration-300">
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-2.5 rounded-full shrink-0 animate-pulse-subtle">
                    <Bell className="text-green-600 w-5 h-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Nueva Orden</p>
                    <p className="text-sm font-black text-gray-900">Mesa 4 • $12.50</p>
                  </div>
                </div>

                <div className="relative bg-gray-900 rounded-[3.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-[10px] border-gray-900 w-[300px] sm:w-[320px] aspect-[9/19] hover:shadow-[0_60px_120px_-20px_rgba(249,115,22,0.4)] transition-shadow duration-500">
                  
                  <div className="bg-white rounded-[3rem] h-full w-full overflow-hidden relative shadow-inner">
                    
                    <img 
                      src="/captura.png" 
                      alt="PupusaTech App Demo"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sibling = e.currentTarget.nextElementSibling;
                        if (sibling) sibling.classList.remove('hidden');
                      }}
                    />
                    
                    <div className="hidden w-full h-full bg-gradient-to-b from-orange-50 to-white flex-col">
                      <div className="h-28 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 w-full shrink-0 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-4xl mb-2">🫓</div>
                          <p className="font-bold">PupusaTech</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-4 flex-1">
                        <div className="h-24 bg-white rounded-3xl shadow-lg border border-gray-100 animate-pulse"></div>
                        <div className="h-24 bg-white rounded-3xl shadow-lg border border-gray-100 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="h-24 bg-white rounded-3xl shadow-lg border border-gray-100 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-20 shadow-lg"></div>
                  <div className="absolute right-0 top-32 w-1 h-16 bg-gray-800 rounded-l-lg"></div>
                  <div className="absolute left-0 top-28 w-1 h-10 bg-gray-800 rounded-r-lg"></div>
                  <div className="absolute left-0 top-40 w-1 h-10 bg-gray-800 rounded-r-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SEPARADOR ELEGANTE */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>

      {/* CARACTERÍSTICAS PREMIUM */}
      <section id="beneficios" data-animate className="py-32 bg-white relative overflow-hidden">
        {/* Grid de fondo decorativo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 px-5 py-2 rounded-full text-sm font-bold text-orange-700 mb-6">
              <Star size={16} className="fill-orange-500 text-orange-500" />
              Funcionalidades
            </div>
            <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-gray-900 via-orange-800 to-gray-900 bg-clip-text text-transparent">
              Todo lo que necesitas
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Diseñado específicamente para la forma de trabajar de las <span className="font-bold text-orange-600">pupuserías salvadoreñas</span>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Smartphone, gradient: 'from-orange-500 to-red-500', bgGradient: 'from-orange-50 to-red-50', title: 'Menú QR', desc: 'Tus clientes escanean y piden. Sin bajar apps.' },
              { icon: ChefHat, gradient: 'from-blue-500 to-cyan-500', bgGradient: 'from-blue-50 to-cyan-50', title: 'Pantalla Cocina', desc: 'Los pedidos llegan directo a una tablet con sonido.' },
              { icon: TrendingUp, gradient: 'from-green-500 to-emerald-500', bgGradient: 'from-green-50 to-emerald-50', title: 'Control Total', desc: 'Cambia precios y apaga productos al instante.' },
              { icon: Zap, gradient: 'from-yellow-500 to-orange-500', bgGradient: 'from-yellow-50 to-orange-50', title: 'Súper Rápido', desc: 'Reduce el tiempo de espera en un 40%.' },
              { icon: DollarSign, gradient: 'from-emerald-500 to-green-500', bgGradient: 'from-emerald-50 to-green-50', title: 'Sin Comisiones', desc: 'No cobramos porcentaje por venta.' },
              { icon: Users, gradient: 'from-purple-500 to-pink-500', bgGradient: 'from-purple-50 to-pink-50', title: 'Soporte Local', desc: 'Te atendemos por WhatsApp de inmediato.' }
            ].map((feature, index) => (
              <div 
                key={index} 
                data-animate
                className={`group relative p-8 rounded-3xl bg-gradient-to-br ${feature.bgGradient} border-2 border-white hover:border-orange-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${
                  visibleSections.has('beneficios') ? 'animate-slide-up-fade' : 'opacity-0'
                }`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}></div>
                
                <div className={`relative w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  <feature.icon size={32} className="group-hover:animate-bounce-subtle" />
                </div>
                
                <h3 className="relative text-2xl font-black mb-4 text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="relative text-gray-700 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEPARADOR ELEGANTE */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>

      {/* DEMO CTA PREMIUM */}
      <section id="demo" data-animate className="py-32 relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-orange-500 rounded-full blur-[150px] opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-red-500 rounded-full blur-[150px] opacity-15 animate-blob-delayed"></div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <div className="mb-6 inline-block">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2 rounded-full text-sm font-bold text-white">
              <Sparkles size={16} className="animate-pulse-subtle" />
              Demo Interactivo
            </div>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-black mb-6 leading-tight text-white">
            Pruébalo tú mismo <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">ahora</span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
            Experimenta con nuestra pupusería de demostración <span className="font-bold text-orange-400">'La Bendición'</span> y descubre cómo funcionará el sistema en tu local.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <a 
              href="/labendicion" 
              className="group relative bg-white/5 backdrop-blur-xl border-2 border-white/10 p-10 rounded-3xl hover:bg-white/10 hover:border-orange-400/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  📱
                </div>
                <h3 className="text-3xl font-black text-white mb-4 group-hover:text-orange-400 transition-colors">Experiencia Cliente</h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Navega el menú, agrega productos y realiza un pedido como lo harían tus clientes.
                </p>
                <div className="flex items-center justify-center gap-2 text-orange-400 font-bold group-hover:gap-4 transition-all">
                  Explorar ahora
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </div>
              </div>
            </a>
            
            <a 
              href="/labendicion/admin" 
              className="group relative bg-white/5 backdrop-blur-xl border-2 border-white/10 p-10 rounded-3xl hover:bg-white/10 hover:border-blue-400/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  👨‍🍳
                </div>
                <h3 className="text-3xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors">Panel de Cocina</h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Administra pedidos, controla el inventario y gestiona tu negocio en tiempo real.
                </p>
                <div className="flex items-center justify-center gap-2 text-blue-400 font-bold group-hover:gap-4 transition-all">
                  Ver panel
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </div>
              </div>
            </a>
          </div>
          
          <p className="mt-12 text-sm text-gray-400 max-w-2xl mx-auto">
            💡 <span className="font-semibold text-white">Tip:</span> Abre ambas vistas en pestañas diferentes para ver cómo los pedidos fluyen del cliente a la cocina en tiempo real.
          </p>
        </div>
      </section>

      {/* SEPARADOR ELEGANTE */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>

      {/* PRECIOS PREMIUM */}
      <section id="precios" data-animate className="py-32 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100 rounded-full blur-[150px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-100 rounded-full blur-[150px] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 text-center mb-20 relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 px-5 py-2 rounded-full text-sm font-bold text-orange-700 mb-6">
            <DollarSign size={16} />
            Inversión
          </div>
          <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-gray-900 via-orange-800 to-gray-900 bg-clip-text text-transparent">
            Precios Claros
          </h2>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
            Sin comisiones por venta. Solo una tarifa plana justa y un pago único para dejarte todo listo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4 relative z-10">
          
          {/* Plan Emprendedor */}
          <div className="bg-white p-10 rounded-3xl shadow-lg border-2 border-gray-200 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative">
              <h3 className="text-xl font-bold text-gray-600 mb-2">Plan Emprendedor</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black text-gray-900">$15</span>
                <span className="text-lg text-gray-400 font-medium">/mes</span>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-6 text-sm text-gray-600 border border-gray-200">
                <p><span className="font-bold text-gray-900">+ $50 Pago Único</span> de Inscripción.</p>
                <p className="text-xs mt-1">Incluye: Creación de menú y diseño de QRs.</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-gray-600 flex-1 text-left">
                <li className="flex gap-3 items-center"><Check size={18} className="text-green-500 shrink-0"/> Menú Digital QR</li>
                <li className="flex gap-3 items-center"><Check size={18} className="text-green-500 shrink-0"/> Pedidos ilimitados</li>
                <li className="flex gap-3 items-center"><Check size={18} className="text-green-500 shrink-0"/> Soporte por WhatsApp</li>
              </ul>
              
              <a href="https://wa.me/50373933442" className="block w-full bg-gray-100 text-gray-900 font-bold py-4 rounded-xl text-center hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg">
                Consultar
              </a>
            </div>
          </div>

          {/* Plan Negocio Pro */}
          <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-orange-500 relative flex flex-col transform md:scale-105 z-10 hover:shadow-orange-500/30 hover:-translate-y-2 transition-all duration-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] uppercase font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl tracking-wider shadow-lg">
              MÁS POPULAR
            </div>
            
            <div className="relative">
              <h3 className="text-xl font-bold text-orange-600 mb-2 mt-2">Plan Negocio Pro</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black text-gray-900">$25</span>
                <span className="text-lg text-gray-400 font-medium">/mes</span>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 mb-6 text-sm text-orange-800 border-2 border-orange-100 shadow-inner">
                <p><span className="font-bold">+ $75 Pago Único</span> de Inscripción.</p>
                <p className="text-xs mt-1 opacity-90">Incluye: Configuración de Tablet, Fotos profesionales y Capacitación.</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-gray-700 flex-1 text-left">
                <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500 shrink-0"/> Todo lo del Plan Básico</li>
                <li className="flex gap-3 items-center font-bold"><Check size={18} className="text-orange-500 shrink-0"/> Pantalla de Cocina (KDS)</li>
                <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500 shrink-0"/> Impresión de Tickets</li>
                <li className="flex gap-3 items-center"><Check size={18} className="text-orange-500 shrink-0"/> Reportes de Ventas</li>
              </ul>
              
              <a href="https://wa.me/50373933442" className="block w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-xl text-center hover:from-orange-700 hover:to-red-700 transition-all duration-300 shadow-xl hover:shadow-orange-500/50 hover:scale-105 relative overflow-hidden group">
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                <span className="relative">Empezar Ahora</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* SEPARADOR ELEGANTE */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>

      {/* FOOTER PREMIUM */}
      <footer className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 text-gray-400 py-16 border-t border-gray-800 relative overflow-hidden">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <div className="mb-6">
            {/* Logo con Imagen Real */}
            <div className="flex items-center gap-3 group cursor-pointer">
              {/* Versión Móvil (Solo ícono) */}
              <img 
                src="/logo-icon.png" 
                alt="PupusaTech Logo" 
                className="h-10 w-auto lg:hidden group-hover:scale-110 transition-transform" 
              />
              
              {/* Versión Escritorio (Logo Completo) */}
              <img 
                src="/logo-fullw.png" 
                alt="PupusaTech Logo Completo" 
                className="hidden lg:block h-12 w-auto group-hover:opacity-90 transition-opacity" 
              />
            </div>
          </div>
          <p className="font-medium text-gray-400">© {new Date().getFullYear()} PupusaTech. Hecho con ❤️ en El Salvador 🇸🇻</p>
          <p className="text-sm text-gray-500 mt-2">Revolucionando las pupuserías, un pedido a la vez.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s ease-in-out infinite;
        }
        .animate-blob-delayed {
          animation: blob 7s ease-in-out infinite 2s;
        }
        .animate-blob-more-delayed {
          animation: blob 7s ease-in-out infinite 4s;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
        
        @keyframes slide-up-fade {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up-fade {
          animation: slide-up-fade 0.8s ease-out forwards;
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}