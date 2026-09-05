const CACHE_PREFIX = 'carrer-baska-';
const CORE_CACHE = CACHE_PREFIX + 'core-v1';
const MEDIA_CACHE = CACHE_PREFIX + 'media-v1';
const CORE = [
  './', './index.html', './style.css', './pwa.js', './manifest.webmanifest',
  './data.js', './engine.js', './progressao.js', './criacaoPersonagem.js',
  './draft.js', './universidades.js', './escolhaUniversidade.js', './universidade.js',
  './times.js', './carreira.js', './temporadanba.js', './draftNba.js', './pro.js',
  './img/favicon.svg', './img/icon-192.png', './img/icon-512.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE)));
});
// Atualizações assumem o controle somente depois de fechar a versão anterior.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && ![CORE_CACHE, MEDIA_CACHE].includes(key))
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope) || request.headers.has('range')) return;
  const isMedia = /\.(png|svg|webp|jpe?g|mp3|woff2?)$/i.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(isMedia ? MEDIA_CACHE : CORE_CACHE);
    const cached = await cache.match(request);
    if (isMedia && cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      if (!response.ok && cached) return cached;
      return response;
    } catch (error) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const home = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (home) return home;
      }
      return Response.error();
    }
  })());
});
