// Service Worker — Salt Bank Instrumente (offline + install PWA)
// Strategie: network-first cu fallback la cache. Bump CACHE_VERSION la fiecare release.
const CACHE_VERSION = 'salt-v2-2026-06-24';
const CACHE_NAME = `salt-instrumente-${CACHE_VERSION}`;
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  // precache rezilient (per-item cu catch, nu addAll atomic)
  e.waitUntil(
    caches.open(CACHE_NAME).then(c =>
      Promise.all(PRECACHE.map(u =>
        c.add(new Request(u, { cache: 'reload' })).catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('salt-instrumente-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // doar same-origin GET (nu cache-uim Yahoo/proxy/API externe)
  if (url.origin !== self.location.origin) return;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then(r => {
      if (r) return r;
      if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        return caches.match('./index.html');
      }
      return new Response('', { status: 504, statusText: 'offline' });
    }))
  );
});
