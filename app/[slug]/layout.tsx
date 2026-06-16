import { Metadata } from 'next'

// Sobrescribe los metadatos solo para el cliente
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: "Menú QR | PupusaTech",
    manifest: `/api/manifest?slug=${params.slug}&mode=cliente`, // 💡 Pide la App de Menú
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}