const CACHE_NAME = 'peach-chat-v3';
const STATIC_ASSETS = ['/', '/index.html'];

// 설치: 정적 파일 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 활성화: 즉시 모든 이전 캐시 삭제 및 제어권 획득
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Fetch: API 요청은 네트워크 우선, 나머지는 캐시 우선
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API 요청 및 소켓 요청은 캐싱하지 않음
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // HTML 요청은 네트워크 우선 (최신 버전 유지)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // 정적 자산은 캐시 우선
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

// 푸시 알림 수신
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

// 알림 클릭 시 해당 페이지로 이동
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = event.notification.data.url;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열린 창이 있으면 포커스 + 해당 URL로 이동
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // 없으면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
