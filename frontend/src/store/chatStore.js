import { create } from 'zustand';
import axios from '../api/axios';
import socket from '../socket/socket';

const useChatStore = create((set, get) => ({
    rooms: [],
    currentRoom: null,
    messages: [],
    isLoading: false,

    fetchRooms: async (channelId) => {
        set({ isLoading: true });
        try {
            // channelId가 있으면 쿼리 파라미터로 전달
            const url = channelId ? `/chat/rooms?channelId=${channelId}` : '/chat/rooms';
            const response = await axios.get(url);
            set({ rooms: response.data, isLoading: false });
        } catch (error) {
            console.error('채팅방 목록 로드 오류:', error);
            set({ isLoading: false });
        }
    },

    setCurrentRoom: async (room) => {
        set({ currentRoom: room, messages: [] });
        if (room) {
            // 소켓 룸 입장
            socket.emit('join_room', room._id);

            // 해당 방의 메시지 내역 조회
            try {
                const response = await axios.get(`/chat/rooms/${room._id}/messages`);
                set({ messages: response.data });
            } catch (error) {
                console.error('메시지 로드 오류:', error);
            }
        }
    },

    sendMessage: (content) => {
        const { currentRoom } = get();
        // localStorage에서 직접 유저 정보를 가져와 보낸이 설정 (authStore와 연계)
        const userStr = localStorage.getItem('user');
        if (!userStr || !currentRoom) return;

        const user = JSON.parse(userStr);

        socket.emit('send_message', {
            roomId: currentRoom._id,
            senderId: user._id,
            content,
            channelId: currentRoom.channelId?._id || currentRoom.channelId
        });
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, message]
        }));
    }
}));

export default useChatStore;
