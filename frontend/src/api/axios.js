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
        return `${window.location.origin}/api`;
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
        // ngrok 무료티어의 브라우저 경고 페이지(HTML) 우회 — 이게 없으면 API가 JSON 대신 경고 HTML을 반환함
        config.headers['ngrok-skip-browser-warning'] = 'true';
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
