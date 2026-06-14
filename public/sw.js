/**
 * SmartSpeak service worker — offline support + installability.
 *
 * Strategy summary:
 *  - App shell (/train etc.): network-first, fallback to cached /train
 *  - /models/, /ort/, /_next/static/: cache-first (immutable after first fetch)
 *  - Everything else (same-origin GET): network-first, fallback to cache
 *  - Non-GET and cross-origin requests: pass through unchanged
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `smartspeak-${CACHE_VERSION}`;

const APP_SHELL = ['/', '/train', '/manifest.webmanifest', '/icon-512.png'];

// Prefixes that should be treated as immutable / large assets — cache-first.
const CACHE_FIRST_PREFIXES = ['/models/', '/ort/', '/_next/static/'];

// ─── Install: precache the app shell ────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches and claim clients ────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET and cross-origin requests.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Cache-first: immutable assets (models, WASM runtime, Next.js static chunks).
  if (CACHE_FIRST_PREFIXES.some((p) => path.startsWith(p))) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for everything else; fall back to cache.
  // Navigation requests fall back to the cached /train shell.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === 'navigate'
              ? caches.match('/train')
              : new Response('Offline', { status: 503 }))
        )
      )
  );
});
