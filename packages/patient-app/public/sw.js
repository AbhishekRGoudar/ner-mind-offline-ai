// Production-grade Service Worker for NER-Mind PWA (SIH Problem Statement 26003)
// Security Invariant: NEVER cache sensitive API responses, auth tokens, or patient records.

const CACHE_VERSION = 'ner-mind-v1-static';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Sensitive endpoint paths that MUST NEVER be cached
const SENSITIVE_API_PATTERNS = [
  /\/api\//i,
  /\/auth\//i,
  /\/sync/i,
  /\/caregiver\//i,
  /\/patient\//i,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[ServiceWorker] Precaching core static application shell...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('ner-mind-') && key !== CACHE_VERSION) {
            console.log('[ServiceWorker] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Strict Security Guard: Never intercept or cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Strict Security Guard: Never intercept or cache sensitive API endpoints
  const isSensitiveApi = SENSITIVE_API_PATTERNS.some((pattern) => pattern.test(url.pathname));
  if (isSensitiveApi) {
    return; // Pass through directly to network; never touch CacheStorage
  }

  // 3. Strict Security Guard: Never cache requests with Authorization bearer headers
  if (request.headers.has('Authorization')) {
    return;
  }

  // 4. HTML Navigation Requests: Network-First with cached SPA shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html').then((cachedShell) => {
          return cachedShell || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // 5. Static Assets (CSS, JS, Fonts, Icons, SVGs, Local Audio Assets)
  // Cache-First with Network fallback and dynamic caching of static resources
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.startsWith('/icons/') ||
     url.pathname.startsWith('/audio/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.woff2') ||
     url.pathname.endsWith('.png'))
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately
          return cachedResponse;
        }

        // Fetch from network and store in static cache
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).catch(() => {
        if (request.destination === 'image') {
          return caches.match('/icons/icon-192.svg');
        }
      });
    })
  );
});
