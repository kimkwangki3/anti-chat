import axios from 'axios';
import useAuthStore from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

if (!baseURL && !import.meta.env.DEV) {
    console.error('CRITICAL: VITE_API_URL is not defined! API requests will fail on mobile.');
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
