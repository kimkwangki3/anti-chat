import { useEffect, useState } from 'react';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import socket from '../socket/socket';
import MessageList from '../components/Chat/MessageList';

const SuperAdminDirectChat = () => {
    const { user } = useAuthStore();
    const { rooms, currentRoom, setCurrentRoom, addMessage, fetchRooms, sendMessage, uploadFile } = useChatStore();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const dmRooms = rooms.filter((room) => room.channelId?.name === '__SUPERADMIN_DM__');

    useEffect(() => {
        const init = async () => {
            try {
                const { data } = await axios.get('/superadmin/users');
                const filtered = data.filter((u) => u._id !== user?._id && u.status !== 'withdrawn');
                setUsers(filtered);
                await fetchRooms();
            } catch (error) {
                console.error('Load superadmin chat users failed:', error);
            } finally {
                setLoading(false);
            }
        };
        if (user?._id) init();
    }, [user?._id, fetchRooms]);

    useEffect(() => {
        const onReceiveMessage = (message) => {
            if (message.roomId === currentRoom?._id) {
                addMessage(message);
            }
        };
        socket.on('receive_message', onReceiveMessage);
        return () => socket.off('receive_message', onReceiveMessage);
    }, [currentRoom?._id, addMessage]);

    const openOrCreateRoom = async (targetUserId) => {
        try {
            const { data } = await axios.post('/chat/rooms/superadmin', { memberId: targetUserId });
            await fetchRooms();
            await setCurrentRoom(data);
        } catch (error) {
            console.error('Create superadmin room failed:', error?.response?.data || error);
            const status = error.response?.status;
            const message = error.response?.data?.message || `채팅방 생성에 실패했습니다. (HTTP ${status || 'N/A'})`;
            alert(message);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!input.trim() && !selectedFile) || !currentRoom || isUploading) return;

        try {
            let fileData = {};
            if (selectedFile) {
                setIsUploading(true);
                const uploaded = await uploadFile(selectedFile);
                fileData = {
                    fileUrl: uploaded.fileUrl,
                    fileType: uploaded.fileType,
                    fileName: uploaded.fileName
                };
            }

            sendMessage(input, fileData);
            setInput('');
            setSelectedFile(null);
        } catch (error) {
            console.error('Send message failed:', error);
            alert('메시지 전송에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const openExistingRoom = async (room) => {
        await setCurrentRoom(room);
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="page-container p-8 text-white">
                최고관리자만 접근할 수 있습니다.
            </div>
        );
    }

    return (
        <div className="page-container h-full p-6 pb-24 text-white md:p-8 md:pb-8">
            <h1 className="mb-6 text-3xl font-black tracking-tight">최고관리자 1:1 채팅</h1>

            <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
                <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#10101a]">
                    <div className="border-b border-white/10 p-4">
                        <p className="text-xs uppercase tracking-widest text-[#8b8ba5]">전체 사용자</p>
                    </div>
                    <div className="max-h-[45%] overflow-y-auto border-b border-white/10 p-2">
                        {loading ? (
                            <div className="p-4 text-sm text-[#8b8ba5]">불러오는 중...</div>
                        ) : (
                            users.map((u) => (
                                <button
                                    key={u._id}
                                    onClick={() => openOrCreateRoom(u._id)}
                                    className="w-full rounded-xl p-3 text-left transition-colors hover:bg-white/5"
                                >
                                    <p className="font-semibold">{u.name || u.username}</p>
                                    <p className="text-xs text-[#8b8ba5]">{u.username} · {u.role}</p>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="border-b border-white/10 p-4">
                        <p className="text-xs uppercase tracking-widest text-[#8b8ba5]">대화방</p>
                    </div>
                    <div className="max-h-[55%] overflow-y-auto p-2">
                        {dmRooms.map((room) => (
                            <button
                                key={room._id}
                                onClick={() => openExistingRoom(room)}
                                className={`w-full rounded-xl p-3 text-left transition-colors ${
                                    currentRoom?._id === room._id
                                        ? 'border border-[#FF8C69]/30 bg-[#FF8C69]/15'
                                        : 'hover:bg-white/5'
                                }`}
                            >
                                <p className="font-semibold">{room.memberId?.name || room.memberId?.username || '사용자'}</p>
                                <p className="truncate text-xs text-[#8b8ba5]">{room.lastMessage || '메시지 없음'}</p>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#10101a]">
                    <div className="border-b border-white/10 p-4">
                        <p className="font-bold">
                            {currentRoom
                                ? `${currentRoom.memberId?.name || currentRoom.memberId?.username}와 대화 중`
                                : '대화 상대를 선택하세요'}
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        {currentRoom ? (
                            <MessageList />
                        ) : (
                            <div className="flex h-full items-center justify-center text-[#8b8ba5]">
                                좌측 목록에서 대화할 사용자를 선택하세요.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="flex gap-3 border-t border-white/10 p-4">
                        <label className="cursor-pointer rounded-xl bg-white/5 px-3 py-2 text-sm">
                            파일
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </label>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-[#0c0c14] px-4 py-2 outline-none"
                            placeholder={isUploading ? '업로드 중...' : '메시지를 입력하세요'}
                            disabled={!currentRoom || isUploading}
                        />
                        <button
                            type="submit"
                            disabled={(!input.trim() && !selectedFile) || !currentRoom || isUploading}
                            className="rounded-xl bg-[#FF8C69] px-4 py-2 font-semibold text-white disabled:opacity-40"
                        >
                            전송
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default SuperAdminDirectChat;
