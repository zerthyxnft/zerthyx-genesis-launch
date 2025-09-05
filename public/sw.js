const CACHE_NAME = 'zerthyx-v1.0.1';
const urlsToCache = [
  '/', // Homepage
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/site.webmanifest',
  '/sitemap.xml',
  '/placeholder.svg'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Some files failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Fetch event (Network first, fallback to cache)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests to avoid TypeError
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Check if the response is valid before cloning and caching
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
        .catch(() => {
          // If offline, try cache
          return caches.match(event.request);
        })
    );
  }
});

// Activate event (Delete old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/android-chrome-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Zerthyx', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
