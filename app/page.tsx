import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-orange-500">
        <div className="text-6xl mb-4">🫓</div>
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">PUPUSATECH</h1>
        <p className="text-gray-500 mb-8">El sistema digital para pupuserías de El Salvador.</p>
        
        <div className="space-y-3">
          <Link 
            href="/labendicion"
            className="block w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {/* Aquí estaba el error, ahora uso comillas simples */}
            👉 Ver Demo &quot;La Bendición&quot;
          </Link>
          
          <button className="block w-full bg-gray-100 text-gray-600 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition">
            Iniciar Sesión (Dueños)
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">v1.0.0 - Alpha</p>
      </div>
    </div>
  )
}