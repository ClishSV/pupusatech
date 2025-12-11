import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// Configuramos la fuente
const outfit = Outfit({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "PupusaTech",
  description: "Sistema de pedidos para pupuserías",
  manifest: "/manifest.json", // <--- AGREGA ESTA LÍNEA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {children}
      </body>
    </html>
  );
}
