/* eslint-disable */
// Deshabilitamos ESLint para este archivo para evitar conflictos con las APIs de Service Worker que Next.js no reconoce

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // SOLO interceptamos las peticiones de navegación (cuando cargan la página visual HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('<html><body style="font-family:sans-serif; text-align:center; padding: 2rem;"><h2>Estás sin internet</h2><p>Revisa tu conexión wifi o datos móviles para continuar usando PupusaTech.</p></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
  }
  // IMPORTANTE: Dejamos pasar todas las demás peticiones (Supabase, APIs, JSON) sin tocarlas
  return;
});