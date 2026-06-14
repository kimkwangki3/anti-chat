const CACHE_NAME = 'peach-chat-v5';

// 설치: 즉시 활성화 (대기 없이 새 SW로 교체)
self.addEventListener('install', () => {
    self.skipWaiting();
});

// 활성화: 모든 이전 캐시 삭제 + 즉시 제어권 획득
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(cacheNames.map((name) => caches.delete(name)))
        )
    );
    self.clients.claim();
});

// fetch 핸들러 없음 → 모든 요청을 브라우저 기본(네트워크)로 처리.
// 자산을 SW가 캐싱하지 않으므로 배포 후 옛 번들이 남아 빈 화면이 되는 문제가 없음.
// (Vite 번들은 파일명에 콘텐츠 해시가 붙어 있어 HTTP 캐시만으로 충분히 빠름)

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
