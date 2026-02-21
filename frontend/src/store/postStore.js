import { create } from 'zustand';
import axios from '../api/axios';

const usePostStore = create((set, get) => ({
    posts: [],
    currentPost: null,
    isLoading: false,
    error: null,

    fetchPosts: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.get('/posts');
            set({ posts: response.data, isLoading: false });
        } catch (error) {
            set({ error: '게시글을 불러오는데 실패했습니다.', isLoading: false });
        }
    },

    fetchPostsByChannel: async (channelId) => {
        if (!channelId) return;
        set({ isLoading: true, error: null });
        try {
            const response = await axios.get(`/posts/channel/${channelId}`);
            set({ posts: response.data, isLoading: false });
        } catch (error) {
            set({ error: '채널 게시글을 불러오는데 실패했습니다.', isLoading: false });
        }
    },

    fetchPostById: async (id) => {
        set({ isLoading: true, error: null, currentPost: null });
        try {
            const response = await axios.get(`/posts/${id}`);
            set({ currentPost: response.data, isLoading: false });
            return response.data;
        } catch (error) {
            set({ error: '게시글 상세 내용을 불러오는데 실패했습니다.', isLoading: false });
        }
    },

    createPost: async (postData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post('/posts', postData);
            set((state) => ({
                posts: [response.data, ...state.posts],
                isLoading: false
            }));
            return true;
        } catch (error) {
            set({ error: '게시글 등록에 실패했습니다.', isLoading: false });
            return false;
        }
    },

    addComment: async (postId, content) => {
        try {
            const response = await axios.post(`/posts/${postId}/comments`, { content });
            set((state) => ({
                currentPost: {
                    ...state.currentPost,
                    comments: [...state.currentPost.comments, response.data]
                }
            }));
            return true;
        } catch (error) {
            set({ error: '댓글 등록에 실패했습니다.' });
            return false;
        }
    },

    markAsRead: async (postId) => {
        try {
            await axios.patch(`/posts/${postId}/read`);
            set((state) => ({
                posts: state.posts.map(p =>
                    p._id === postId ? { ...p, readBy: [...(p.readBy || []), 'already_read'] } : p
                )
            }));
        } catch (error) {
            console.error('게시글 읽음 처리 실패:', error);
        }
    },

    reset: () => set({ posts: [], currentPost: null, isLoading: false, error: null })
}));

export default usePostStore;
