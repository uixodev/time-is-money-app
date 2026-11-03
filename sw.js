/* Tons service worker: makes the app installable and usable offline.
   Network first (so updates show up straight away), cached copy when offline. */
const CACHE = 'tons-shell-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'timers.js', 'app.js', 'config.js', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('.supabase.co')) return;               // never cache account / sync calls
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
