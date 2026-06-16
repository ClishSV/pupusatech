import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; // 💡 Aquí esperamos el parámetro
  return {
    title: "Menú QR | PupusaTech",
    manifest: `/api/manifest?slug=${slug}&mode=cliente`, 
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}