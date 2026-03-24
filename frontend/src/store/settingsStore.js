import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
    persist(
        (set) => ({
            soundType: 'peach',
            volume: 0.5,
            notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',

            setSoundType: (type) => set({ soundType: type }),
            setVolume: (val) => set({ volume: val }),
            setNotificationPermission: (perm) => set({ notificationPermission: perm }),
        }),
        {
            name: 'peach-settings',
        }
    )
);

export default useSettingsStore;
