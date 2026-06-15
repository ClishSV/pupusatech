/* eslint-disable */
// Deshabilitamos ESLint para que no evalúe este archivo de JavaScript plano en la compilación

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
});