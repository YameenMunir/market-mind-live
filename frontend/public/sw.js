const OFFLINE_CACHE = "mml-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Deliberately does not cache API responses, build chunks, or WebSocket traffic - this app
// shows live/near-live prices, and serving a cached quote while "offline-first" would be
// actively misleading for a fintech dashboard. The only job of this worker is (a) satisfy
// PWA installability, which requires a service worker with a fetch handler, and (b) show a
// friendly offline page instead of the browser's default error when navigation fails offline.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
