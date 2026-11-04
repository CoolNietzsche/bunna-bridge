/*
 * Beersheba service worker — lets the field app (/field) open without network.
 * - Built assets (/assets/*) and icons: cache-first (file names are content-hashed).
 * - Page navigations: network-first, falling back to the cached app shell.
 * - API calls are never cached; the field app queues writes in IndexedDB instead.
 */
const CACHE = "bb-shell-v1";
const SHELL = ["/", "/field", "/apple-touch-icon.png", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/") || url.pathname.startsWith("/admin")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/field", copy));
          return res;
        })
        .catch(() => caches.match("/field").then((r) => r || caches.match("/"))),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
  }
});
