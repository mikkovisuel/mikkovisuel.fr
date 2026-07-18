// No offline cache: the espace client (tasks, documents, deliverables)
// changes constantly and must always show fresh data. This handler only
// exists so Chrome/Android treat the site as installable.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: falls through to the network.
});
