import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: "Caja y Despacho | PupusaTech",
    manifest: `/api/manifest?slug=${params.slug}&mode=despacho`, // 💡 Pide la App de Despacho
  }
}

export default function DespachoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}