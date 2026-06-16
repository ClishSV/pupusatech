import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "KDS Cocina | PupusaTech",
    manifest: `/api/manifest?slug=${slug}&mode=cocina`, 
  }
}

export default function CocinaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}