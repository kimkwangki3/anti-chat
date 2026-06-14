import { io } from 'socket.io-client';

const resolveSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }

    if (import.meta.env.DEV) {
        return 'http://localhost:5000';
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return 'http://127.0.0.1:5000';
};

const socketUrl = resolveSocketUrl();

if (!import.meta.env.VITE_SOCKET_URL && !import.meta.env.DEV) {
    console.warn(`[SOCKET] VITE_SOCKET_URL is not defined. Falling back to ${socketUrl}`);
}

const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
    // ngrok 무료티어 경고 페이지 우회 (polling 핸드셰이크용)
    transportOptions: {
        polling: {
            extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
        }
    }
});

export default socket;
