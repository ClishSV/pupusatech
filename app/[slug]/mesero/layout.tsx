import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "POS Mesero | PupusaTech",
    manifest: `/api/manifest?slug=${slug}&mode=mesero`, 
  }
}

export default function MeseroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}