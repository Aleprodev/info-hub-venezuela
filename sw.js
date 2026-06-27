/**
 * Service Worker — Venezuela InfoSismo
 * Estrategia: cache-first para assets, network-first para USGS API
 */

const CACHE_VERSION = 'vzla-infosismo-v18';
const USGS_CACHE = 'vzla-usgs-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './manifest.json',
  './data.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Tailwind CDN — se intentará cachear en el primer fetch exitoso
  'https://cdn.tailwindcss.com'
];

const USGS_URL_PATTERN = 'earthquake.usgs.gov';

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // cachear assets que podemos controlar directamente
      const localAssets = STATIC_ASSETS.filter(url => !url.startsWith('http'));
      return cache.addAll(localAssets).catch((err) => {
        console.warn('[SW] Error cacheando assets locales:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_VERSION && name !== USGS_CACHE)
          .map(name => {
            console.log('[SW] Eliminando cache obsoleto:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Ignorar requests que no son GET
  if (request.method !== 'GET') return;

  // Analítica (GoatCounter) → no interceptar; pasa directo a la red.
  // Así el conteo siempre se registra cuando hay conexión y nunca se cachea.
  if (url.includes('goatcounter.com') || url.includes('gc.zgo.at')) return;

  // USGS API → network-first con fallback a cache
  if (url.includes(USGS_URL_PATTERN)) {
    event.respondWith(networkFirstWithCache(request, USGS_CACHE));
    return;
  }

  // Assets estáticos → cache-first con fallback a network
  event.respondWith(cacheFirstWithNetwork(request));
});

/**
 * Cache-first: sirve desde cache. Si no existe, va a red y lo guarda.
 * Usado para assets estáticos (HTML, JS, JSON, íconos).
 */
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Si es la página principal y no hay cache, mostramos el fallback
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

/**
 * Network-first: intenta red primero. Si falla, devuelve cache.
 * Usado para la API de USGS para tener siempre datos recientes si hay red.
 */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await Promise.race([
      fetch(request.clone()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 7000)
      )
    ]);

    if (networkResponse && networkResponse.status === 200) {
      // Guardar en cache junto con timestamp
      cache.put(request, networkResponse.clone());
      // Notificar al cliente que los datos se actualizaron
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'USGS_UPDATED',
          timestamp: Date.now()
        }));
      });
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      // Notificar al cliente que estamos usando datos cacheados
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'USGS_FROM_CACHE',
          timestamp: Date.now()
        }));
      });
      return cached;
    }
    throw err;
  }
}

// ─── MENSAJES DESDE EL CLIENTE ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});
