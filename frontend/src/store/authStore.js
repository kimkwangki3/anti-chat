import { create } from 'zustand';
import axios from '../api/axios';

const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isLoading: false,
    error: null,

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/login', { username, password });
            const { token, ...userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            set({ user: userData, token, isLoading: false });
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.message || '로그인에 실패했습니다.',
                isLoading: false
            });
            return false;
        }
    },

    register: async (name, username, password, role) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/register', { name, username, password, role });
            const { token, ...userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            set({ user: userData, token, isLoading: false });
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.message || error.message || '회원가입에 실패했습니다.',
                isLoading: false
            });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get('/auth/me');
            localStorage.setItem('user', JSON.stringify(response.data));
            set({ user: response.data });
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ user: null, token: null });
        }
    }
}));

export default useAuthStore;
