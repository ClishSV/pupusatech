import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Caja y Despacho | PupusaTech",
    manifest: `/api/manifest?slug=${slug}&mode=despacho`, 
  }
}

export default function DespachoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}