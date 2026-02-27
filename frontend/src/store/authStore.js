import { create } from 'zustand';
import axios from '../api/axios';
import useChatStore from './chatStore';
import useChannelStore from './channelStore';
import useNoticeStore from './noticeStore';
import usePostStore from './postStore';
import useNotificationStore from './notificationStore';

const getSafeUser = () => {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        localStorage.removeItem('user');
        return null;
    }
};

const useAuthStore = create((set) => ({
    user: getSafeUser(),
    token: localStorage.getItem('token') || null,
    sessionId: localStorage.getItem('sessionId') || null,
    isLoading: false,
    error: null,

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/login', { username, password });
            const { token, sessionId, ...userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('user', JSON.stringify(userData));
            set({ user: userData, token, sessionId, isLoading: false });
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.message || '로그인에 실패했습니다.',
                isLoading: false
            });
            return false;
        }
    },

    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/register', userData);
            const { token, sessionId, ...data } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('user', JSON.stringify(userData));
            set({ user: userData, token, sessionId, isLoading: false });
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
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        set({ user: null, token: null, sessionId: null });

        // 모든 스토어 리셋
        useChatStore.getState().reset();
        useChannelStore.getState().reset();
        useNoticeStore.getState().reset();
        usePostStore.getState().reset();
        useNotificationStore.getState().resetStore();
    },

    updateProfile: async (name) => {
        try {
            const response = await axios.patch('/auth/profile', { name });
            const updatedUser = response.data;

            localStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
            return true;
        } catch (error) {
            console.error('프로필 수정 에러:', error);
            return false;
        }
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get('/auth/me');
            const userData = response.data;

            // 유저 정보 저장
            localStorage.setItem('user', JSON.stringify(userData));

            // 만약 서버에서 준 유저 정보에 sessionId가 있다면 동기화 (세션 불일치 방지)
            if (userData.currentSessionId) {
                localStorage.setItem('sessionId', userData.currentSessionId);
                set({ user: userData, sessionId: userData.currentSessionId });
            } else {
                set({ user: userData });
            }
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('sessionId');
            set({ user: null, token: null, sessionId: null });
        }
    }
}));

export default useAuthStore;
