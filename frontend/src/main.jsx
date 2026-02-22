import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('[APP] Initializing React application...');
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(async (reg) => {
        console.log('[SW] Service Worker registered:', reg.scope);

        // 서비스 워커 업데이트 감지
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          console.log('[SW] Update found, installing new service worker...');

          newWorker.addEventListener('statechange', async () => {
            // 새 서비스 워커가 활성화되면 기존 push subscription 해제 (재구독 유도)
            if (newWorker.state === 'activated') {
              console.log('[SW] New service worker activated, clearing old push subscription...');
              try {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                  await sub.unsubscribe();
                  console.log('[SW] Old push subscription cleared — will resubscribe on next login');
                }
              } catch (e) {
                console.error('[SW] Failed to clear push subscription:', e);
              }
            }
          });
        });
      })
      .catch(err => console.log('[SW] Service Worker registration failed:', err));
  });
}
