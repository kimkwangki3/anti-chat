import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
    notifications: [],
    // 채널별 읽지 않은 항목 수 { [channelId]: { notice: 0, post: 0, chat: 0 } }
    unreadCounts: {},

    addNotification: (notification) => {
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 5) // 최근 5개만 유지
        }));

        // 5초 후 자동 삭제 로직은 컴포넌트에서 처리하거나 여기서 setTimeout 사용 가능
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
                    [channelId]: {
                        ...counts,
                        [type]: counts[type] + 1
                    }
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
                    [channelId]: {
                        ...counts,
                        [type]: 0
                    }
                }
            };
        });
    },

    resetStore: () => set({ notifications: [], unreadCounts: {} })
}));

export default useNotificationStore;
