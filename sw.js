/* RESET · service worker
   Abre al instante y funciona sin conexión.

   Cada versión de la app tiene su propia caché (CACHE). Al instalarse una
   versión nueva se descargan TODOS sus archivos juntos (sin usar copias viejas
   del navegador) y recién entonces se activa; mientras tanto la versión
   anterior sigue completa. Así nunca se mezclan archivos de versiones distintas.

   Tus preguntas y tu historial viven en localStorage: este archivo no los toca.
   Para publicar una versión nueva: cambia el número de CACHE y la lista ASSETS. */

const CACHE = "reset-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./mensajes.js",
  "./preguntas.js",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(ASSETS.map((url) =>
        fetch(new Request(url, { cache: "reload" })).then((res) => {
          if (!res.ok) throw new Error("No se pudo descargar " + url);
          return cache.put(url, res);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === "navigate" ? "./index.html" : req;
  e.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(key, { ignoreSearch: true }))
      .then((hit) => hit || fetch(req))
  );
});
