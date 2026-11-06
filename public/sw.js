// Minimal service worker: makes the site installable and shows a friendly page when offline.
// Pages and assets always come from the network first, so updates reach phones immediately.
const OFFLINE = '/offline.html';
const CACHE = 'pollisum-offline-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return; // only page loads; API calls are never touched
  e.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
});
