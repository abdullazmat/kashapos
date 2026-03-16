const STATIC_CACHE = "kashapos-static-v1";
const API_CACHE = "kashapos-api-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(["/", "/dashboard", "/dashboard/offline"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") {
    return;
  }

  if (
    url.pathname.startsWith("/api/products") ||
    url.pathname.startsWith("/api/categories") ||
    url.pathname.startsWith("/api/customers")
  ) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cached = await cache.match(event.request);
          return (
            cached ||
            new Response(JSON.stringify({ error: "Offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
      }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(event.request)
        .then((resp) => resp || caches.match("/dashboard/offline")),
    ),
  );
});
