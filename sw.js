/**
 * Service Worker — Venezuela InfoSismo
 * Estrategia: cache-first para assets estáticos, network-first para USGS API
 */

const CACHE_VERSION = 'vzla-infosismo-v22';
const USGS_CACHE    = 'vzla-usgs-v2';
const SW_TIMEOUT_MS = 7000;

// Caches válidos — cualquier otro se limpia en activate
const VALID_CACHES = new Set([CACHE_VERSION, USGS_CACHE]);

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
];

const USGS_URL_PATTERN = 'earthquake.usgs.gov';

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Error cacheando assets:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter(name => !VALID_CACHES.has(name))
          .map(name => {
            console.log('[SW] Eliminando cache obsoleto:', name);
            return caches.delete(name);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET') return;

  // GoatCounter — no interceptar; el conteo requiere red real
  if (url.includes('goatcounter.com') || url.includes('gc.zgo.at')) return;

  if (url.includes(USGS_URL_PATTERN)) {
    event.respondWith(networkFirstWithCache(request, USGS_CACHE));
    return;
  }

  event.respondWith(cacheFirstWithNetwork(request));
});

/**
 * Cache-first: sirve desde cache. Si no existe, va a red y lo guarda.
 * Usado para assets estáticos (HTML, JS, JSON, íconos, Tailwind CDN).
 */
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse?.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

/**
 * Network-first: intenta red con timeout. Si falla, devuelve cache.
 * Usado para la API USGS para mostrar siempre los datos más recientes.
 */
async function networkFirstWithCache(request, cacheName) {
  const cache      = await caches.open(cacheName);
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), SW_TIMEOUT_MS);

  try {
    const networkResponse = await fetch(request.clone(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (networkResponse?.status === 200) {
      cache.put(request, networkResponse.clone());
      self.clients.matchAll().then(clients =>
        clients.forEach(client => client.postMessage({
          type: 'USGS_UPDATED',
          timestamp: Date.now(),
        }))
      );
    }
    return networkResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    const cached = await cache.match(request);
    if (cached) {
      self.clients.matchAll().then(clients =>
        clients.forEach(client => client.postMessage({
          type: 'USGS_FROM_CACHE',
          timestamp: Date.now(),
        }))
      );
      return cached;
    }
    throw err;
  }
}

// ─── MENSAJES DESDE EL CLIENTE ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});
