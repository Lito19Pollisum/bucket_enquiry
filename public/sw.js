// Minimal service worker: makes the site installable and shows a friendly page when offline.
// Pages and assets always come from the network first, so updates reach phones immediately.
const OFFLINE = '/offline.html';
const CACHE = 'pollisum-offline-v1';
const ASSETS = 'pollisum-assets-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE && x !== ASSETS).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Fingerprinted build files (photos, scripts, styles) never change under the same name: serve repeat visits from the phone.
  if (u.origin === location.origin && u.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(ASSETS).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }));
    return;
  }
  if (r.mode !== 'navigate') return; // other requests (API calls included) are never touched
  e.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
});
