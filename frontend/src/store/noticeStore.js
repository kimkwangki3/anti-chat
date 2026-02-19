import { create } from 'zustand';
import axios from '../api/axios';

const useNoticeStore = create((set, get) => ({
    notices: [],
    isLoading: false,
    error: null,

    fetchNotices: async (channelId) => {
        if (!channelId) return;
        set({ isLoading: true, error: null });
        try {
            const response = await axios.get(`/notices/channel/${channelId}`);
            set({ notices: response.data, isLoading: false });
        } catch (error) {
            set({ error: '공지사항을 불러오는데 실패했습니다.', isLoading: false });
        }
    },

    createNotice: async (channelId, title, content, imageUrl = null) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/notices', { channelId, title, content, imageUrl });
            set((state) => ({
                notices: [response.data, ...state.notices],
                isLoading: false
            }));
            return true;
        } catch (error) {
            set({ error: '공지사항 등록에 실패했습니다.', isLoading: false });
            return false;
        }
    },

    uploadImage: async (formData) => {
        try {
            const response = await axios.post('/notices/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data.imageUrl;
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            return null;
        }
    },

    deleteNotice: async (id) => {
        try {
            await axios.delete(`/notices/${id}`);
            set((state) => ({
                notices: state.notices.filter(n => n._id !== id)
            }));
            return true;
        } catch (error) {
            set({ error: '공지사항 삭제에 실패했습니다.' });
            return false;
        }
    },

    markAsRead: async (id) => {
        try {
            const response = await axios.patch(`/notices/${id}/read`);
            set((state) => ({
                notices: state.notices.map(n => n._id === id ? response.data : n)
            }));
        } catch (error) {
            console.error('읽음 처리 실패:', error);
        }
    },

    reset: () => set({ notices: [], isLoading: false, error: null })
}));

export default useNoticeStore;
