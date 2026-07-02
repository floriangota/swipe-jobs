// Minimal service worker — installability only (M0).
// No offline caching yet: a managed caching strategy (Serwist) is deferred to
// Phase 2 per docs/roadmap.md. Keep this a clean pass-through.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch handler on purpose — the network serves all requests. Adding a no-op
// listener would only add overhead.
