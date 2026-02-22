import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

if (!socketUrl && !import.meta.env.DEV) {
    console.error('CRITICAL: VITE_SOCKET_URL is not defined! Socket connection will fail on mobile.');
}

const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false
});

export default socket;
