const CACHE_NAME = 'krishna-story-appv1';
const BASE_PATH = '/Story-App-Krishna';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/app.bundle.js`,
  `${BASE_PATH}/app.css`,
  `${BASE_PATH}/images/hero.png`,
  `${BASE_PATH}/favicon.png`,
  `${BASE_PATH}/images/logo.png`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/sw.bundle.js`,
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {}
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const serviceWorkerUrl = self.location.href;

  if (event.request.url === serviceWorkerUrl) {
    return;
  }

  if (
    event.request.method !== 'GET' ||
    event.request.url.startsWith('chrome-extension://') ||
    event.request.url.includes('devtools')
  ) {
    return;
  }

  const isAppShell = urlsToCache.some(url => event.request.url.endsWith(url));
  if (isAppShell) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(async response => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.match(`${BASE_PATH}/index.html`);
      })
  );
});

self.addEventListener('push', event => {
  let notificationData = {
    title: 'Story App Krishna',
    body: 'A new story has just been published. Be the first to read it!',
    icon: `${BASE_PATH}/images/logo.png`,
    badge: `${BASE_PATH}/images/logo.png`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: '/Story-App-Krishna',
    },
    actions: [
      {
        action: 'explore',
        title: 'Read Now',
        icon: `${BASE_PATH}/images/logo.png`,
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: `${BASE_PATH}/images/logo.png`,
      },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) notificationData.title = data.title;
      if (data.body) notificationData.body = data.body;
      if (data.icon) notificationData.icon = data.icon;
      if (data.data) {
        const storyId = data.data.storyId || data.data.id;
        notificationData.data = {
          ...notificationData.data,
          ...data.data,
          url: storyId ? `/#/stories/${storyId}` : notificationData.data.url,
        };
      }
    } catch (error) {
      const text = event.data.text();
      if (text) notificationData.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(clientList => {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});
