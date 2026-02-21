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
            // 읽음 처리 호출 (API)
            get().markAsRead(room._id);

            // 소켓으로 읽음 처리 (isRead 필드 업데이트)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                socket.emit('mark_read', { roomId: room._id, userId: user._id });
            }

            // 해당 방의 메시지 내역 조회
            try {
                const response = await axios.get(`/chat/rooms/${room._id}/messages`);
                set({ messages: response.data });
            } catch (error) {
                console.error('메시지 로드 오류:', error);
            }
        }
    },

    markAsRead: async (roomId) => {
        try {
            await axios.put(`/chat/rooms/${roomId}/read`);
            set(state => ({
                rooms: state.rooms.map(r =>
                    r._id === roomId
                        ? { ...r, unreadCountAdmin: 0, unreadCountMember: 0 }
                        : r
                )
            }));
        } catch (error) {
            console.error('읽음 처리 실패:', error);
        }
    },

    hideRoom: async (roomId) => {
        try {
            await axios.put(`/chat/rooms/${roomId}/hide`);
            set(state => ({
                rooms: state.rooms.filter(r => r._id !== roomId),
                currentRoom: state.currentRoom?._id === roomId ? null : state.currentRoom
            }));
        } catch (error) {
            console.error('방 숨기기 실패:', error);
        }
    },

    updateRoomInList: (updatedRoom) => {
        set(state => {
            // 현재 열람 중인 방이면 unreadCount를 항상 0으로 고정
            const processedRoom = state.currentRoom?._id === updatedRoom._id
                ? { ...updatedRoom, unreadCountAdmin: 0, unreadCountMember: 0 }
                : updatedRoom;

            const index = state.rooms.findIndex(r => r._id === processedRoom._id);
            let newRooms = [...state.rooms];
            if (index !== -1) {
                newRooms[index] = processedRoom;
            } else {
                newRooms.push(processedRoom);
            }
            // 최신순 정렬
            newRooms.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
            return { rooms: newRooms };
        });
    },

    sendMessage: (content, fileData = {}) => {
        const { currentRoom } = get();
        const userStr = localStorage.getItem('user');
        if (!userStr || !currentRoom) return;

        const user = JSON.parse(userStr);
        const { fileUrl, fileType, fileName } = fileData;

        socket.emit('send_message', {
            roomId: currentRoom._id,
            senderId: user._id,
            content,
            fileUrl,
            fileType,
            fileName,
            channelId: currentRoom.channelId?._id || currentRoom.channelId
        });
    },

    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            throw error;
        }
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, message]
        }));
    },

    // 상대방이 읽었을 때 메시지의 isRead를 true로 업데이트
    markMessagesRead: (roomId, readerId) => {
        set((state) => ({
            messages: state.messages.map(msg => {
                // senderId가 객체({_id: ...}) 또는 문자열일 수 있으므로 처리
                const senderIdStr = msg.senderId?._id?.toString() || msg.senderId?.toString();
                // readerId가 보낸 메시지가 아닌 것(= 내가 보낸 메시지)을 읽음 처리
                return senderIdStr !== readerId?.toString()
                    ? { ...msg, isRead: true }
                    : msg;
            })
        }));
    },

    reset: () => set({ rooms: [], currentRoom: null, messages: [], isLoading: false })
}));

export default useChatStore;
