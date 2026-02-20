import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],
            // 채널�??��? ?��? ??�� ??{ [channelId]: { notice: 0, post: 0, chat: 0 } }
            unreadCounts: {},
            // 채널�?미승??가???�청 ??(관리자?? { [channelId]: number }
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
                set((state) => {
                    const counts = state.unreadCounts[channelId] || { notice: 0, post: 0, chat: 0 };
                    return {
                        unreadCounts: {
                            ...state.unreadCounts,
                            [channelId]: { ...counts, [type]: (counts[type] || 0) + 1 }
                        }
                    };
                });
            },

            resetUnreadCount: (channelId, type) => {
                set((state) => {
                    const counts = state.unreadCounts[channelId] || { notice: 0, post: 0, chat: 0 };
                    return {
                        unreadCounts: {
                            ...state.unreadCounts,
                            [channelId]: { ...counts, [type]: 0 }
                        }
                    };
                });
            },

            // 미승??가???�청 ??증�? (관리자??
            incrementPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: {
                        ...state.pendingCounts,
                        [channelId]: (state.pendingCounts[channelId] || 0) + 1
                    }
                }));
            },

            // 미승??가???�청 ??차감 (?�인/거절 ??
            decrementPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: {
                        ...state.pendingCounts,
                        [channelId]: Math.max(0, (state.pendingCounts[channelId] || 0) - 1)
                    }
                }));
            },

            // ?�정 채널 미승????초기??
            resetPendingCount: (channelId) => {
                set((state) => ({
                    pendingCounts: { ...state.pendingCounts, [channelId]: 0 }
                }));
            },

            // ?�체 미승?????�산
            getTotalPendingCount: () => {
                const { pendingCounts } = get();
                return Object.values(pendingCounts).reduce((sum, n) => sum + n, 0);
            },

            resetStore: () => set({ notifications: [], unreadCounts: {}, pendingCounts: {} })
        }),
        {
            name: 'PEACH-notifications', // localStorage key
        }
    )
);

export default useNotificationStore;

