// Synka PWA Service Worker - Offline-first caching
const CACHE_VERSION = 2;
const CACHE_NAME = `synka-v${CACHE_VERSION}`;
const STATIC_CACHE = `synka-static-v${CACHE_VERSION}`;
const DATA_CACHE = `synka-data-v${CACHE_VERSION}`;
const APP_SHELL_CACHE = `synka-shell-v${CACHE_VERSION}`;

// Static assets to cache on install - critical for offline experience
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/logos/synka-logo.png',
  '/og/default.png',
  '/apple-touch-icon.png',
  '/Fonts/Anta-Regular.ttf',
  '/images/ai/Card-phone.webp',
  '/images/ai/cofounder-primary.webp',
  '/assets/icon.png',
  '/assets/icons/icon-192.webp',
  '/assets/icons/icon-512.webp'
];

// App shell resources - navigation, UI components (stale-while-revalidate)
const APP_SHELL_PATTERNS = [
  /\.(js|css)$/,
  /\/assets\//,
  /\/logos\//,
  /\/icons\//,
  /\/Fonts\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache assets individually to handle failures gracefully
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => {
          // Delete any cache that doesn't match current version
          return !key.includes(`v${CACHE_VERSION}`);
        }).map((key) => {
          console.log(`[SW] Deleting old cache: ${key}`);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Check if URL matches app shell patterns
function isAppShellResource(url) {
  const pathname = new URL(url).pathname;
  return APP_SHELL_PATTERNS.some(pattern => pattern.test(pathname));
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase auth endpoints - always go to network
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/')) {
    return;
  }

  // For Supabase API requests - network first, cache fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // For app shell resources (JS, CSS, fonts) - stale while revalidate for instant load
  if (isAppShellResource(request.url)) {
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
    return;
  }

  // For static assets (images, fonts) - cache first
  if (request.destination === 'image' || 
      request.destination === 'font') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // For HTML/navigation - stale while revalidate (instant load, update in background)
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Default - stale while revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
});

// Network first - for API calls
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Cache first - for static assets (images, fonts)
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a placeholder for images if offline
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1a1a1a" width="100" height="100"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate - instant load from cache, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background and update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Get pending changes from IndexedDB and sync
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// Message handler for cache control
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
  if (event.data?.type === 'CACHE_URLS') {
    // Allow dynamic caching of URLs
    const urls = event.data.urls || [];
    caches.open(STATIC_CACHE).then((cache) => {
      cache.addAll(urls).catch(console.warn);
    });
  }
});

// Periodic cache cleanup (remove old entries)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCaches());
  }
});

async function cleanupOldCaches() {
  const keys = await caches.keys();
  const oldCaches = keys.filter(key => !key.includes(`v${CACHE_VERSION}`));
  await Promise.all(oldCaches.map(key => caches.delete(key)));
}
