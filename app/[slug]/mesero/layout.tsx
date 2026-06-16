import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: "POS Mesero | PupusaTech",
    manifest: `/api/manifest?slug=${params.slug}&mode=mesero`, // 💡 Pide la App de Mesero
  }
}

export default function MeseroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}