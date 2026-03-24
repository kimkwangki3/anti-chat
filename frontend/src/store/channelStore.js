import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../api/axios';

const useChannelStore = create(
    persist(
        (set, get) => ({
            myChannels: [],
            searchResults: [],
            currentChannel: null,
            isLoading: false,

            setCurrentChannel: (channel) => set({ currentChannel: channel }),

            fetchMyChannels: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.get('/channels/my-channels');
                    set({ myChannels: response.data, isLoading: false });
                } catch (error) {
                    set({ error: error.response?.data?.message || '내 채널 정보를 가져오는데 실패했습니다.', isLoading: false });
                }
            },

            fetchChannelById: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.get(`/channels/${id}`);
                    set({ isLoading: false });
                    return response.data;
                } catch (error) {
                    set({ error: '채널 정보를 가져오는데 실패했습니다.', isLoading: false });
                    return null;
                }
            },

            fetchChannelBySlug: async (slug) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.get(`/channels/slug/${slug}`);
                    set({ isLoading: false });
                    return response.data;
                } catch (error) {
                    set({ error: error.response?.data?.message || '채널 주소를 불러오는데 실패했습니다.', isLoading: false });
                    return null;
                }
            },

            updateChannel: async (id, name, description, profileImage, cardColor, slug) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.put(`/channels/${id}`, { name, description, profileImage, cardColor, slug });
                    set((state) => ({
                        myChannels: state.myChannels.map(m =>
                            m.channelId?._id === id ? { ...m, channelId: response.data } : m
                        ),
                        currentChannel: state.currentChannel?._id === id ? response.data : state.currentChannel,
                        isLoading: false
                    }));
                    return true;
                } catch (error) {
                    set({ error: error.response?.data?.message || '채널 정보를 수정하는데 실패했습니다.', isLoading: false });
                    return false;
                }
            },

            searchChannels: async (query) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.get(`/channels/search?q=${query}`);
                    set({ searchResults: response.data, isLoading: false });
                } catch (error) {
                    set({ error: error.response?.data?.message || '채널 검색에 실패했습니다.', isLoading: false });
                }
            },

            createChannel: async (formData) => {
                try {
                    await axios.post('/channels', formData);
                    get().fetchMyChannels();
                    return true;
                } catch (error) {
                    alert(error.response?.data?.message || '채널 생성 실패');
                    return false;
                }
            },

            joinChannel: async (channelId) => {
                try {
                    await axios.post('/channel-members/join', { channelId });
                    return true;
                } catch (error) {
                    alert(error.response?.data?.message || '가입 신청에 실패했습니다.');
                    return false;
                }
            },

            leaveChannel: async (channelId) => {
                try {
                    const response = await axios.post('/channel-members/leave', { channelId });
                    alert(response.data.message || '채널에서 탈퇴했습니다.');
                    get().fetchMyChannels();

                    if (get().currentChannel?._id === channelId) {
                        set({ currentChannel: null });
                    }
                    return true;
                } catch (error) {
                    alert(error.response?.data?.message || '채널 탈퇴에 실패했습니다.');
                    return false;
                }
            },

            reset: () => set({ myChannels: [], searchResults: [], currentChannel: null, isLoading: false })
        }),
        {
            name: 'channel-storage', // localStorage key
            partialize: (state) => ({ currentChannel: state.currentChannel, myChannels: state.myChannels }),
        }
    )
);

export default useChannelStore;
