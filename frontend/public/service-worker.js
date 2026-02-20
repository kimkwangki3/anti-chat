const CACHE_NAME = 'peach-chat-v1';
const STATIC_ASSETS = ['/', '/index.html', '/vite.svg'];

// ?¤ì¹˜: ?•ì  ?Œì¼ ìºì‹±
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ?œì„±?? ?¤ë˜??ìºì‹œ ?•ë¦¬
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Fetch: API ?”ì²­?€ ?¤íŠ¸?Œí¬ ?°ì„ , ?˜ë¨¸ì§€??ìºì‹œ ?°ì„ 
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API ?”ì²­ ë°??Œì¼“ ?”ì²­?€ ìºì‹±?˜ì? ?ŠìŒ
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // HTML ?”ì²­?€ ?¤íŠ¸?Œí¬ ?°ì„  (ìµœì‹  ë²„ì „ ? ì?)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // ?•ì  ?ì‚°?€ ìºì‹œ ?°ì„ 
    event.respondWith(
        caches.match(request).then((cached) => {
            return cached || fetch(request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});

// ?¸ì‹œ ?Œë¦¼ ?˜ì‹ 
self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [100, 50, 100],
            tag: data.tag || 'general-notification',
            renotify: true,
            data: {
                url: data.url || '/'
            }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// ?Œë¦¼ ?´ë¦­ ???´ë‹¹ ?˜ì´ì§€ë¡??´ë™
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = event.notification.data.url;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // ?´ë? ?´ë¦° ì°½ì´ ?ˆìœ¼ë©??¬ì»¤??+ ?´ë‹¹ URLë¡??´ë™
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // ?†ìœ¼ë©???ì°??´ê¸°
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
