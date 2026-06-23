import { create } from 'zustand';
import axios from '../api/axios';
import socket from '../socket/socket';
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

    login: async (username, password, channelId = null) => {
        set({ isLoading: true, error: null });
        try {
            const body = { username, password };
            if (channelId) body.channelId = channelId;
            const response = await axios.post('/auth/login', body);
            const { token, sessionId, ...userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('user', JSON.stringify(userData));
            // 토큰을 먼저 store에 반영해야 이후 요청 인터셉터가 Authorization 헤더를 붙임
            set({ user: userData, token, sessionId });

            // 로그인 응답은 일부 필드(profileImage, status 등)가 비어 있으므로
            // 즉시 /auth/me로 완전한 프로필을 동기화 → 새로고침 없이도 새로고침과 동일한 상태 확보
            try {
                const me = await axios.get('/auth/me');
                localStorage.setItem('user', JSON.stringify(me.data));
                set({ user: me.data, isLoading: false });
            } catch (e) {
                // /auth/me 실패해도 로그인 자체는 성공으로 처리 (로그인 응답 user 유지)
                set({ isLoading: false });
            }
            return true;
        } catch (error) {
            set({
                error: error.response?.data?.message || '로그인에 실패했습니다.',
                isLoading: false
            });
            return false;
        }
    },

    // 외부 프로그램 직접 자동 로그인: URL의 id/pwd/보안번호로 로그인
    directLogin: async ({ username, password, channelSlug, channelId, key }) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/login-direct', { username, password, channelSlug, channelId, key });
            const { token, sessionId, channelSlug: slug, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('user', JSON.stringify(userData));
            if (slug) localStorage.setItem('channelLoginSlug', slug);
            set({ user: userData, token, sessionId, isLoading: false });
            return true;
        } catch (error) {
            set({ error: error.response?.data?.message || '자동 로그인에 실패했습니다.', isLoading: false });
            return false;
        }
    },

    // 외부(델파이) 시스템 자동 로그인: 일회용 코드를 세션으로 교환
    ssoLogin: async (code) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/auth/sso/exchange', { code });
            const { token, sessionId, channelSlug, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('user', JSON.stringify(userData));
            if (channelSlug) localStorage.setItem('channelLoginSlug', channelSlug);
            set({ user: userData, token, sessionId, isLoading: false });
            return true;
        } catch (error) {
            set({ error: error.response?.data?.message || '자동 로그인에 실패했습니다.', isLoading: false });
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
        // 소켓을 즉시 끊어 서버가 오프라인 처리하도록 (로그아웃 실시간 반영)
        try { if (socket.connected) socket.disconnect(); } catch (e) { /* ignore */ }

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

    updateProfile: async (name, nickname) => {
        try {
            const response = await axios.patch('/auth/profile', { name, nickname });
            const updatedUser = response.data;

            localStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
            return true;
        } catch (error) {
            console.error('프로필 수정 에러:', error);
            return false;
        }
    },

    uploadProfileImage: async (formData) => {
        try {
            const response = await axios.post('/auth/profile/image', formData);

            // 응답 구조: { profileImage: url, user: updatedUser }
            const profileImageUrl = response.data.profileImage;
            const updatedUser = response.data.user;

            // user 객체 갱신 (spread로 기존 필드 유지 + profileImage 교체)
            set((state) => {
                const newUser = updatedUser || { ...state.user, profileImage: profileImageUrl };
                localStorage.setItem('user', JSON.stringify(newUser));
                return { user: newUser };
            });

            return { success: true, profileImage: profileImageUrl };
        } catch (error) {
            console.error('프로필 이미지 업로드 에러:', error);
            return {
                success: false,
                message: error.response?.data?.detail || error.response?.data?.message || error.message
            };
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
            // 토큰이 실제로 무효일 때(401/403)만 로그아웃. 네트워크/일시 오류(타임아웃, 5xx 등)는 기존 세션 유지.
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('sessionId');
                set({ user: null, token: null, sessionId: null });
            }
            // 그 외(네트워크 끊김/일시 오류)는 로그인 상태를 그대로 유지해 새로고침 시 튕김 방지
        }
    }
}));

export default useAuthStore;
