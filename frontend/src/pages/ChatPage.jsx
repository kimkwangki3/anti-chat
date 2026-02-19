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
    const roomId = queryParams.get('roomId');

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
        if (rooms.length > 0) {
            if (roomId) {
                const targetRoom = rooms.find(r => r._id === roomId);
                if (targetRoom && currentRoom?._id !== targetRoom._id) {
                    setCurrentRoom(targetRoom);
                }
            } else if (user?.role === 'member' && rooms.length === 1 && !currentRoom) {
                setCurrentRoom(rooms[0]);
            }
        }
    }, [rooms, user, currentRoom, setCurrentRoom, roomId]);

    useEffect(() => {
        if (!socket.connected) {
            socket.auth = { token };
            socket.connect();
            // 개인 알림 룸 참가를 위한 setup 이벤트 호출
            socket.emit('setup', user);
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
        <div className="flex h-full bg-[#1a1a24] overflow-hidden relative">
            {/* PC: 항상 보임 / 모바일: 방 선택 안됐을 때만 보임 */}
            <div className={`w-full md:w-80 h-full ${currentRoom ? 'hidden md:block' : 'block'}`}>
                <ChatSidebar />
            </div>

            {/* PC: 남은 영역 / 모바일: 방 선택 됐을 때만 보임 (전체화면) */}
            <div className={`flex-1 flex flex-col min-w-0 bg-[#1a1a24] relative shadow-2xl ${!currentRoom ? 'hidden md:flex' : 'flex'}`}>
                {currentRoom ? (
                    <>
                        <div className="h-16 md:h-20 flex-shrink-0 bg-[#1a1a24]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 z-10">
                            <div className="flex items-center gap-3">
                                {/* 모바일 뒤로가기 버튼 */}
                                <button
                                    onClick={() => setCurrentRoom(null)}
                                    className="md:hidden w-10 h-10 flex items-center justify-center text-white"
                                >
                                    <span className="text-xl">←</span>
                                </button>
                                <div>
                                    <h2 className="text-sm md:text-lg font-bold text-white tracking-tight">
                                        {user?.role === 'admin' ? currentRoom.memberId?.name : currentRoom.adminId?.name}
                                    </h2>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full shadow-[0_0_8px_rgba(6,214,160,0.5)]"></span>
                                        <span className="text-[8px] md:text-[9px] font-bold text-[#06d6a0] uppercase tracking-[0.2em] font-mono leading-none">ACTIVE</span>
                                    </div>
                                </div>
                            </div>

                            {user.role === 'admin' && (
                                <button
                                    onClick={() => navigate(`/admin/members?channelId=${channelId}`)}
                                    className="px-3 py-2 md:px-5 md:py-2.5 bg-[#FF9500]/10 text-[#FF9500] text-[9px] md:text-[10px] font-bold rounded-xl border border-[#FF9500]/20 hover:bg-[#FF9500] hover:text-white transition-all uppercase tracking-widest"
                                >
                                    관리
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <MessageList />
                        </div>

                        <div className="p-4 md:p-6 flex-shrink-0 bg-[#1a1a24] border-t border-white/5">
                            <form onSubmit={handleSend} className="max-w-5xl mx-auto flex gap-3 items-end">
                                <div className="relative flex-1 group">
                                    <div className="absolute -inset-1 orange-gradient rounded-2xl blur opacity-[0.05] group-focus-within:opacity-20 transition duration-500 pointer-events-none"></div>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="메시지를 입력하세요..."
                                        className="relative z-10 w-full bg-[#23232f] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[#FF9500]/30 transition-all shadow-xl placeholder:text-[#3a3a4a]"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="h-[48px] px-6 orange-gradient text-white rounded-2xl flex items-center justify-center shadow-xl shadow-[#FF9500]/20 transition-all font-bold uppercase text-[10px] tracking-widest disabled:opacity-20"
                                >
                                    보내기
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none">
                        <div className="w-24 h-24 mb-10 orange-gradient rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-[#FF9500]/20 animate-pulse">🧸</div>
                        <h1 className="text-3xl font-black tracking-widest uppercase italic font-mono mb-4 text-white">Message Waiting</h1>
                        <p className="max-w-xs text-[12px] font-bold uppercase tracking-[0.2em] leading-relaxed text-[#6b6b8a] mb-10">대화 상대를 선택하고<br />즐거운 소통을 시작해 보세요.</p>

                        {user.role === 'member' && rooms.length === 0 && (
                            <button
                                onClick={() => navigate(`/chat?channelId=${channelId}`)}
                                className="px-10 py-5 orange-gradient text-white text-xs font-black rounded-2xl shadow-xl shadow-[#FF9500]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]"
                            >
                                관리자와 첫 대화 시작하기 ✨
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
