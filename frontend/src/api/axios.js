import axios from 'axios';
import useAuthStore from '../store/authStore';

const resolveBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (import.meta.env.DEV) {
        return 'http://localhost:5000/api';
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:5000/api`;
    }

    return 'http://127.0.0.1:5000/api';
};

const baseURL = resolveBaseURL();

if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
    console.warn(`[API] VITE_API_URL is not defined. Falling back to ${baseURL}`);
}

const instance = axios.create({
    baseURL,
    withCredentials: true,
});

instance.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
