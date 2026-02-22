import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- Mobile Remote Debugging Hook ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const debugDiv = document.createElement('div');
  debugDiv.style.position = 'fixed';
  debugDiv.style.top = '0';
  debugDiv.style.left = '0';
  debugDiv.style.width = '100%';
  debugDiv.style.height = '100%';
  debugDiv.style.backgroundColor = 'rgba(255,0,0,0.9)';
  debugDiv.style.color = 'white';
  debugDiv.style.zIndex = '99999';
  debugDiv.style.padding = '20px';
  debugDiv.style.overflow = 'auto';
  debugDiv.style.fontSize = '12px';
  debugDiv.style.fontFamily = 'monospace';
  debugDiv.innerText = `[JS Error]\nMsg: ${msg}\nUrl: ${url}\nLine: ${lineNo}\nStack: ${error?.stack}`;
  document.body.appendChild(debugDiv);
  return false;
};

window.onunhandledrejection = function (event) {
  const debugDiv = document.createElement('div');
  debugDiv.style.position = 'fixed';
  debugDiv.style.bottom = '0';
  debugDiv.style.left = '0';
  debugDiv.style.width = '100%';
  debugDiv.style.backgroundColor = 'orange';
  debugDiv.style.color = 'black';
  debugDiv.style.zIndex = '99999';
  debugDiv.style.padding = '10px';
  debugDiv.style.fontSize = '10px';
  debugDiv.innerText = `[Promise Rejection]: ${event.reason}`;
  document.body.appendChild(debugDiv);
};
// ------------------------------------

// --- Env Debug Tool ---
const envDiv = document.createElement('div');
envDiv.style.position = 'fixed';
envDiv.style.top = '10px';
envDiv.style.right = '10px';
envDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
envDiv.style.color = '#00ff00';
envDiv.style.zIndex = '99998';
envDiv.style.padding = '5px 10px';
envDiv.style.fontSize = '9px';
envDiv.style.borderRadius = '5px';
envDiv.style.pointerEvents = 'none';
envDiv.innerText = `API: ${import.meta.env.VITE_API_URL || 'MISSING'}\nSOC: ${import.meta.env.VITE_SOCKET_URL || 'MISSING'}\nDEV: ${import.meta.env.DEV}`;
document.body.appendChild(envDiv);
// ----------------------

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
