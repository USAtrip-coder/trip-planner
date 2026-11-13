// Offline support: keeps the app itself on the device. Trip data is cached by Firebase separately.
const V = 'trip-shell-v1';
const SHELL = ['./', './index.html', './fb.js', './firebase-config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('trip-shell-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === 'navigate') {
      // Network first so updates arrive; fall back to the saved copy offline.
      e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open('trip-fonts').then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { c.put(req, r.clone()); return r; }))));
  }
});
