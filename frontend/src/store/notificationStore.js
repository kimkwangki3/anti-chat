import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],
            // 채널별 읽지 않은 항목 수 { [channelId]: { notice: 0, post: 0, chat: 0 } }
            unreadCounts: {},
            // 채널별 미승인 가입 신청 수 (관리자용) { [channelId]: number }
            pendingCounts: {},

            addNotification: (notification) => {
                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 5)
                }));
            },

            removeNotification: (id) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== id)
                }));
            },

            incrementUnreadCount: (channelId, type) => {
                const cid = channelId?.toString();
                if (!cid) return;
                set((state) => {
                    const counts = state.unreadCounts[cid] || { notice: 0, post: 0, chat: 0, poll: 0 };
                    return {
                        unreadCounts: {
                            ...state.unreadCounts,
                            [cid]: { ...counts, [type]: (counts[type] || 0) + 1 }
                        }
                    };
                });
            },

            resetUnreadCount: (channelId, type) => {
                const cid = channelId?.toString();
                if (!cid) return;
                set((state) => {
                    const counts = state.unreadCounts[cid] || { notice: 0, post: 0, chat: 0, poll: 0 };
                    return {
                        unreadCounts: {
                            ...state.unreadCounts,
                            [cid]: { ...counts, [type]: 0 }
                        }
                    };
                });
            },

            // 미승인 가입 신청 수 증가 (관리자용)
            incrementPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: {
                        ...state.pendingCounts,
                        [channelId]: (state.pendingCounts[channelId] || 0) + 1
                    }
                }));
            },

            // 미승인 가입 신청 수 차감 (승인/거절 후)
            decrementPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: {
                        ...state.pendingCounts,
                        [channelId]: Math.max(0, (state.pendingCounts[channelId] || 0) - 1)
                    }
                }));
            },

            // 특정 채널 미승인 수 초기화
            resetPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: { ...state.pendingCounts, [channelId]: 0 }
                }));
            },

            // 전체 미승인 수 합산
            getTotalPendingCount: () => {
                const { pendingCounts } = get();
                return Object.values(pendingCounts).reduce((sum, n) => sum + n, 0);
            },

            setUnreadCounts: (counts) => set({ unreadCounts: counts }),

            fetchUnreadCounts: async () => {
                try {
                    const { default: axios } = await import('../api/axios');
                    const { data } = await axios.get('/channels/unread-counts');
                    console.log('[NotificationStore] Fetched Unread Counts:', data);
                    set({ unreadCounts: data });
                } catch (error) {
                    console.error('Fetch unread counts failed:', error);
                }
            },

            resetStore: () => set({ notifications: [], unreadCounts: {}, pendingCounts: {} })
        }),
        {
            name: 'peach-notifications', // localStorage key
        }
    )
);

export default useNotificationStore;

