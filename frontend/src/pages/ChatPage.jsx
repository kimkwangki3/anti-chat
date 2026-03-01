import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/Chat/ChatSidebar';
import MessageList from '../components/Chat/MessageList';
import useChatStore from '../store/chatStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import socket from '../socket/socket';

const ChatPage = () => {
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const { currentRoom, setCurrentRoom, sendMessage, addMessage, fetchRooms, rooms, uploadFile } = useChatStore();
    const { currentChannel } = useChannelStore();
    const { resetUnreadCount } = useNotificationStore();
    const { user, token } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');
    const roomId = queryParams.get('roomId');

    useEffect(() => {
        const initChat = async () => {
            // 채널이 바뀌면 일단 현재 방 선택 해제 (잔상 방지)
            setCurrentRoom(null);

            if (channelId) {
                await fetchRooms(channelId);
                resetUnreadCount(channelId, 'chat');
            } else {
                await fetchRooms();
            }
        };
        initChat();
    }, [channelId, fetchRooms, resetUnreadCount, setCurrentRoom]);

    // roomId URL 파라미터로 방 자동 입장 (최초 1회만)
    useEffect(() => {
        if (roomId && rooms.length > 0 && !currentRoom) {
            const targetRoom = rooms.find(r => r._id === roomId);
            if (targetRoom) {
                setCurrentRoom(targetRoom);
            }
        } else if (!roomId && user?.role === 'member' && rooms.length === 1 && !currentRoom) {
            // 멤버이면서 방이 1개뿐이고 아직 선택 안 됐을 때만 자동 입장
            setCurrentRoom(rooms[0]);
        }
        // currentRoom은 의존성에서 제외 - rooms 변경시 재진입 방지
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rooms, roomId]);

    useEffect(() => {
        if (!socket.connected) {
            socket.auth = { token };
            socket.connect();
            const sid = localStorage.getItem('sessionId');
            socket.emit('setup', { ...user, sessionId: sid });
        }

        socket.on('receive_message', (message) => {
            const { currentRoom, markAsRead } = useChatStore.getState();
            if (message.roomId === currentRoom?._id) {
                addMessage(message);
                // 상대방 메시지 수신 시 현재 방이면 즉시 읽음 처리 (버그 수정)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const u = JSON.parse(userStr);
                    const senderId = message.senderId?._id || message.senderId;
                    if (senderId?.toString() !== u._id?.toString()) {
                        socket.emit('mark_read', { roomId: currentRoom._id, userId: u._id });
                        markAsRead(currentRoom._id);
                    }
                }
            }
        });

        socket.on('chat_error', (errorData) => {
            alert(errorData.message || '메시지 전송에 실패했습니다.');
        });

        return () => {
            socket.off('receive_message');
            socket.off('chat_error');
        };
    }, [currentRoom?._id, addMessage, token]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
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
            setIsUploading(false);
        } catch (error) {
            alert('전송에 실패했습니다. 다시 시도해 주세요.');
            setIsUploading(false);
        }
    };

    const handleClear = async () => {
        if (window.confirm('지우시겠습니까?')) {
            try {
                const { clearMessages } = useChatStore.getState();
                await clearMessages(currentRoom._id, channelId);
            } catch (error) {
                alert('대화내용 삭제에 실패했습니다.');
            }
        }
    };

    if (!channelId && !currentRoom) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a24] text-[#6b6b8a] flex-col gap-4">
                <div className="w-20 h-20 bg-[#23232f] rounded-3xl border border-white/5 flex items-center justify-center text-3xl opacity-50 shadow-inner">💬</div>
                <h2 className="text-xl font-bold text-white font-mono tracking-widest text-center uppercase">대상을 선택하세요</h2>
            </div>
        );
    }

    const themeColor = currentChannel?.cardColor || '#FF8C69';
    const channelName = currentChannel?.name || '알 수 없는 채널';

    return (
        <div className="flex h-full bg-[#1a1a24] overflow-hidden relative text-[#e8e8f0]">
            {/* PC: 항상 보임 / 모바일: 방 선택 안됐을 때만 보임 */}
            <div className={`w-full md:w-80 h-full pt-safe md:pt-0 ${currentRoom ? 'hidden md:block' : 'block'}`}>
                <ChatSidebar />
            </div>

            {/* PC: 남은 영역 / 모바일: 방 선택 됐을 때만 보임 (전체화면) */}
            <div className={`flex-1 flex flex-col min-w-0 bg-[#1a1a24] relative shadow-2xl ${!currentRoom ? 'hidden md:flex' : 'flex'}`}>
                {currentRoom ? (
                    <>
                        <header className="p-4 md:p-6 flex justify-between items-center border-b border-white/5 bg-[#1a1a24]/80 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                {/* 뒤로가기 버튼 */}
                                <button
                                    onClick={() => setCurrentRoom(null)}
                                    className="p-2 md:hidden text-white/50 hover:text-white transition-colors"
                                >
                                    <span className="text-xl">←</span>
                                </button>

                                {/* 채널 로고 추가 */}
                                <div
                                    className="w-10 h-10 md:w-12 md:h-12 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl"
                                    style={{ backgroundColor: `${currentChannel?.cardColor || '#FF8C69'}20` }}
                                >
                                    {currentChannel?.profileImage ? (
                                        <img src={currentChannel.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black" style={{ color: currentChannel?.cardColor || '#FF8C69' }}>
                                            {channelName?.[0] || '#'}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        {(user?._id === currentRoom.adminId?._id || user?._id === currentRoom.adminId)
                                            ? currentRoom.memberId?.name
                                            : currentRoom.adminId?.name}
                                        <span
                                            className="px-2 py-0.5 text-[9px] rounded-lg font-black uppercase tracking-widest border border-white/5"
                                            style={{ backgroundColor: `${currentChannel?.cardColor || '#FF8C69'}15`, color: currentChannel?.cardColor || '#FF8C69' }}
                                        >
                                            {channelName}
                                        </span>
                                    </h2>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full shadow-[0_0_8px_rgba(6,214,160,0.5)] animate-pulse"></span>
                                        <span className="text-[9px] font-bold text-[#06d6a0] uppercase tracking-[0.2em] font-mono leading-none">실시간 대화 중</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {user.role === 'admin' && (
                                    <>
                                        <button
                                            onClick={handleClear}
                                            className="px-3 py-1.5 md:px-5 md:py-2 bg-red-500/10 text-red-500 text-[9px] md:text-[10px] font-bold rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
                                        >
                                            대화내용 삭제
                                        </button>
                                        <button
                                            onClick={() => navigate(`/admin/members?channelId=${channelId}`)}
                                            className="px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-[10px] font-bold rounded-xl border transition-all uppercase tracking-widest"
                                            style={{ backgroundColor: `${themeColor}1A`, color: themeColor, borderColor: `${themeColor}33` }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColor; e.currentTarget.style.color = 'white'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}1A`; e.currentTarget.style.color = themeColor; }}
                                        >
                                            멤버 관리
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setCurrentRoom(null)}
                                    className="hidden md:flex p-2 text-white/30 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
                                >
                                    닫기
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <MessageList />
                        </div>

                        <div className="p-4 md:p-6 flex-shrink-0 bg-[#1a1a24] border-t border-white/5">
                            <div className="max-w-5xl mx-auto flex flex-col gap-3">
                                {selectedFile && (
                                    <div className="flex items-center justify-between bg-[#23232f] border border-white/5 rounded-2xl px-5 py-3 animate-in fade-in slide-in-from-bottom-2 shadow-xl">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <span className="text-xl">{selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[12px] text-white font-bold truncate">{selectedFile.name}</span>
                                                <span className="text-[9px] text-[#444466] font-mono font-bold">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFile(null)}
                                            className="p-1 hover:text-white transition-colors text-[#444466]"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                <form onSubmit={handleSend} className="flex gap-4 items-end">
                                    <div className="relative flex-1 group">
                                        <div className="absolute -inset-1 rounded-2xl blur opacity-[0.03] group-focus-within:opacity-10 transition duration-500 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
                                        <div className="relative z-10 flex items-center bg-[#23232f] border border-white/5 rounded-2xl overflow-hidden transition-all shadow-xl" onFocus={(e) => e.currentTarget.style.borderColor = themeColor} onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                            <label className="p-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-center">
                                                <span className="text-lg opacity-40 hover:opacity-100 transition-opacity">📎</span>
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder={isUploading ? "파일을 업로드하는 중..." : "메시지를 입력하세요..."}
                                                disabled={isUploading}
                                                className="flex-1 bg-transparent px-4 py-4 text-[14px] text-white focus:outline-none placeholder:text-[#3a3a4a] disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && !selectedFile) || isUploading}
                                        className="h-[56px] px-8 text-white rounded-2xl flex items-center justify-center shadow-xl transition-all font-bold uppercase text-[11px] tracking-widest disabled:opacity-20 active:scale-95"
                                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px ${themeColor}40` }}
                                    >
                                        {isUploading ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : '보내기'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none" style={{ backgroundImage: `radial-gradient(circle at center, ${themeColor}05, transparent)` }}>
                        <div className="w-24 h-24 mb-10 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 20px 40px ${themeColor}33` }}>🧸</div>
                        <h1 className="text-4xl font-black tracking-[0.2em] uppercase italic font-mono mb-4 text-white">대기 중</h1>
                        <p className="max-w-xs text-[12px] font-bold uppercase tracking-[0.3em] leading-relaxed text-[#555577] mb-10">대화 상대를 선택하고<br />즐거운 소통을 시작해 보세요.</p>

                        {user.role === 'member' && rooms.length === 0 && (
                            <button
                                onClick={() => navigate(`/chat?channelId=${channelId}`)}
                                className="px-10 py-5 text-white text-[11px] font-black rounded-2xl shadow-xl transition-all uppercase tracking-[0.2em] hover:scale-105 active:scale-95"
                                style={{ backgroundColor: themeColor, boxShadow: `0 15px 25px ${themeColor}40` }}
                            >
                                운영진과 첫 대화 시작하기 ✨
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
