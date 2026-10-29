/* Far Out — offline support for the installed app. Serves the game from cache and refreshes it
   in the background, so it opens instantly and works without a connection (except online play). */
const CACHE = 'farout-__BUILD__';
const CORE = ['./', 'index.html', 'css/style.css', 'css/screens.css', 'data/bank.js', 'manifest.webmanifest', 'assets/icon-192.png',
  'js/text.js', 'js/core.js', 'js/fx.js', 'js/ui.js', 'js/collection.js', 'js/sharecard.js', 'js/solo.js', 'js/net.js', 'js/crew.js', 'js/crew-view.js', 'js/main.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
