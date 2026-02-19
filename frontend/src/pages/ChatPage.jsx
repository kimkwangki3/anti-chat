import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/Chat/ChatSidebar';
import MessageList from '../components/Chat/MessageList';
import useChatStore from '../store/chatStore';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import socket from '../socket/socket';

const ChatPage = () => {
    const [input, setInput] = useState('');
    const { currentRoom, setCurrentRoom, sendMessage, addMessage, fetchRooms, rooms } = useChatStore();
    const { resetUnreadCount } = useNotificationStore();
    const { user, token } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    useEffect(() => {
        const initChat = async () => {
            if (channelId) {
                await fetchRooms(channelId);
                resetUnreadCount(channelId, 'chat');
            } else {
                await fetchRooms();
            }
        };
        initChat();
    }, [channelId, fetchRooms, resetUnreadCount]);

    useEffect(() => {
        if (user?.role === 'member' && rooms.length === 1 && !currentRoom) {
            setCurrentRoom(rooms[0]);
        }
    }, [rooms, user, currentRoom, setCurrentRoom]);

    useEffect(() => {
        if (!socket.connected) {
            socket.auth = { token };
            socket.connect();
        }

        socket.on('receive_message', (message) => {
            if (message.roomId === currentRoom?._id) {
                addMessage(message);
            }
        });

        return () => {
            socket.off('receive_message');
        };
    }, [currentRoom?._id, addMessage, token]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !currentRoom) return;
        sendMessage(input);
        setInput('');
    };

    if (!channelId && !currentRoom) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a24] text-[#6b6b8a] flex-col gap-4">
                <div className="w-20 h-20 bg-[#23232f] rounded-3xl border border-white/5 flex items-center justify-center text-3xl opacity-50 shadow-inner">💬</div>
                <h2 className="text-xl font-bold text-white font-mono tracking-widest text-center uppercase">대상을 선택하세요</h2>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#1a1a24] overflow-hidden">
            <ChatSidebar />
            <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a24] relative shadow-2xl">
                {currentRoom ? (
                    <>
                        <div className="h-20 flex-shrink-0 bg-[#1a1a24]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    {user?.role === 'admin' ? currentRoom.memberId?.name : currentRoom.adminId?.name}
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full shadow-[0_0_8px_rgba(6,214,160,0.5)]"></span>
                                    <span className="text-[9px] font-bold text-[#06d6a0] uppercase tracking-[0.2em] font-mono leading-none">ACTIVE SESSION</span>
                                </div>
                            </div>

                            {user.role === 'admin' && (
                                <button
                                    onClick={() => navigate(`/admin/members?channelId=${channelId}`)}
                                    className="px-5 py-2.5 bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-bold rounded-xl border border-[#FF9500]/20 hover:bg-[#FF9500] hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-[#FF9500]/5"
                                >
                                    멤버 관리
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(255,149,0,0.02),transparent)]">
                            <MessageList />
                        </div>

                        <div className="p-6 flex-shrink-0 bg-[#1a1a24] border-t border-white/5">
                            <form onSubmit={handleSend} className="max-w-5xl mx-auto flex gap-4 items-end">
                                <div className="relative flex-1 group">
                                    <div className="absolute -inset-0.5 orange-gradient rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="따뜻한 메시지를 전해보세요..."
                                        className="w-full bg-[#23232f] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#FF9500]/50 transition-all shadow-inner placeholder:text-[#3a3a4a]"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="h-[52px] px-8 orange-gradient text-white rounded-2xl flex items-center justify-center shadow-xl shadow-[#FF9500]/20 transition-all font-bold uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95"
                                >
                                    전송
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30 select-none">
                        <div className="w-20 h-20 mb-8 bg-[#FF9500]/10 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner">🧸</div>
                        <h1 className="text-2xl font-black tracking-widest uppercase italic font-mono mb-2">Message Waiting</h1>
                        <p className="max-w-xs text-[11px] font-bold uppercase tracking-[0.2em] leading-relaxed">대화 상대를 선택하고<br />즐거운 소통을 시작해 보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
