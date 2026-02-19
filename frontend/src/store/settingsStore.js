import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
    persist(
        (set) => ({
            soundType: 'orange',
            volume: 0.5,
            notificationPermission: Notification.permission,

            sounds: {
                orange: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
                crystal: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
                knock: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
            },

            setSoundType: (type) => set({ soundType: type }),
            setVolume: (val) => set({ volume: val }),
            setNotificationPermission: (perm) => set({ notificationPermission: perm }),
        }),
        {
            name: 'anti-settings',
        }
    )
);

export default useSettingsStore;
