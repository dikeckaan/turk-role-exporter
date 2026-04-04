/**
 * Service Worker for offline support.
 * Static assets: cache-first. API responses: network-first with cache fallback.
 */

const CACHE_VERSION = "role-exporter-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/api.js",
  "./js/cihazlar.js",
  "./js/csv.js",
  "./js/filtreler.js",
  "./js/frekanslar.js",
  "./js/harita.js",
  "./js/tablo.js",
  "./js/utils.js",
  "./js/state.js",
  "./js/loading.js",
  "./js/banner.js",
  "./js/data-sources.js",
  "./js/device-ui.js",
  "./js/filter-ui.js",
  "./js/auth-modal.js",
  "./js/csv-import.js",
  "./js/theme.js",
  "./js/presets.js",
  "./js/undo.js",
  "./js/fallback-data.js",
  "./data/turkey-provinces.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
