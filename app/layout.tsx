import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import PWARegister from "./PWARegister";

// Configuramos la fuente original (Preservado)
const outfit = Outfit({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-outfit',
});

// 💡 CONFIGURACIÓN DEL VIEWPORT (PWA y bloqueo de zoom automático en móviles)
export const viewport: Viewport = {
  themeColor: "#ea580c", // Naranja PupusaTech
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom molesto al tocar inputs en el celular
};

// 💡 METADATA UNIFICADA (PWA y compatibilidad con iOS)
export const metadata: Metadata = {
  title: "PupusaTech",
  description: "Sistema de pedidos para pupuserías",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true, // Remueve la barra de navegación en iPhones
    statusBarStyle: "default",
    title: "PupusaTech",
  },
  formatDetection: {
    telephone: false, // Evita que iOS interprete números de mesa como llamadas
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> {/* 🇸🇻 Configurado en español para El Salvador */}
      <body className={outfit.className}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}