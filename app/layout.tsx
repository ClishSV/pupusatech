import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import PWARegister from "./PWARegister";

const outfit = Outfit({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-outfit',
});

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

export const metadata: Metadata = {
  title: "PupusaTech",
  description: "Sistema de pedidos para pupuserías",
  manifest: "/api/manifest", // 💡 Apuntamos a la API por defecto
  appleWebApp: {
    capable: true, 
    statusBarStyle: "default",
    title: "PupusaTech",
  },
  formatDetection: {
    telephone: false, 
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={outfit.className}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}