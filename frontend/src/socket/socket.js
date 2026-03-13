import { io } from 'socket.io-client';

const resolveSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }

    if (import.meta.env.DEV) {
        return 'http://localhost:5000';
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:5000`;
    }

    return 'http://127.0.0.1:5000';
};

const socketUrl = resolveSocketUrl();

if (!import.meta.env.VITE_SOCKET_URL && !import.meta.env.DEV) {
    console.warn(`[SOCKET] VITE_SOCKET_URL is not defined. Falling back to ${socketUrl}`);
}

const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false
});

export default socket;
