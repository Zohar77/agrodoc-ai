// AgroDoc AI Service Worker — Push Notifications + Offline Support
const CACHE_NAME = 'agrodoc-v4';
const URLS_TO_CACHE = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || '🌿 AgroDoc AI Alert';
  const options = {
    body: data.body || 'Disease outbreak reported near your farm.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: '👁 View Alert' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'view' || !e.action) {
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
  }
});
