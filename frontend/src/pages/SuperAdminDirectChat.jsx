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
                const filtered = data.filter((u) => u._id !== user?._id && u.role !== 'withdrawn');
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
            alert(error.response?.data?.message || '채팅방 생성에 실패했습니다.');
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
        <div className="page-container p-6 md:p-8 pb-24 md:pb-8 text-white h-full">
            <h1 className="text-3xl font-black tracking-tight mb-6">최고관리자 1:1 채팅</h1>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 h-[calc(100vh-180px)]">
                <aside className="bg-[#10101a] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <p className="text-xs text-[#8b8ba5] uppercase tracking-widest">전체 사용자</p>
                    </div>
                    <div className="max-h-[45%] overflow-y-auto p-2 border-b border-white/10">
                        {loading ? (
                            <div className="p-4 text-sm text-[#8b8ba5]">불러오는 중...</div>
                        ) : (
                            users.map((u) => (
                                <button
                                    key={u._id}
                                    onClick={() => openOrCreateRoom(u._id)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <p className="font-semibold">{u.name || u.username}</p>
                                    <p className="text-xs text-[#8b8ba5]">{u.username} · {u.role}</p>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="p-4 border-b border-white/10">
                        <p className="text-xs text-[#8b8ba5] uppercase tracking-widest">대화방</p>
                    </div>
                    <div className="max-h-[55%] overflow-y-auto p-2">
                        {dmRooms.map((room) => (
                            <button
                                key={room._id}
                                onClick={() => openExistingRoom(room)}
                                className={`w-full text-left p-3 rounded-xl transition-colors ${currentRoom?._id === room._id ? 'bg-[#FF8C69]/15 border border-[#FF8C69]/30' : 'hover:bg-white/5'}`}
                            >
                                <p className="font-semibold">{room.memberId?.name || room.memberId?.username || '사용자'}</p>
                                <p className="text-xs text-[#8b8ba5] truncate">{room.lastMessage || '메시지 없음'}</p>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="bg-[#10101a] border border-white/10 rounded-2xl flex flex-col min-h-0">
                    <div className="p-4 border-b border-white/10">
                        <p className="font-bold">
                            {currentRoom ? `${currentRoom.memberId?.name || currentRoom.memberId?.username}님과 대화` : '대화 상대를 선택하세요'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                        {currentRoom ? (
                            <MessageList />
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#8b8ba5]">
                                좌측 목록에서 대화할 사용자를 선택하세요.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-3">
                        <label className="px-3 py-2 bg-white/5 rounded-xl cursor-pointer text-sm">
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
                            className="flex-1 bg-[#0c0c14] border border-white/10 rounded-xl px-4 py-2 outline-none"
                            placeholder={isUploading ? '업로드 중...' : '메시지를 입력하세요'}
                            disabled={!currentRoom || isUploading}
                        />
                        <button
                            type="submit"
                            disabled={(!input.trim() && !selectedFile) || !currentRoom || isUploading}
                            className="px-4 py-2 bg-[#FF8C69] text-white rounded-xl font-semibold disabled:opacity-40"
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
