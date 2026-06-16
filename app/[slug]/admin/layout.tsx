import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: "KDS Cocina | PupusaTech",
    manifest: `/api/manifest?slug=${params.slug}&mode=cocina`, // 💡 Pide la App de Cocina
  }
}

export default function CocinaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}