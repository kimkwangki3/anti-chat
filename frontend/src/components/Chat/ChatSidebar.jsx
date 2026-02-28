import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import axios from '../../api/axios';
import socket from '../../socket/socket';
import UserAvatar from '../Common/UserAvatar';

const ChatSidebar = () => {
    const {
        rooms, fetchRooms, currentRoom, setCurrentRoom,
        isLoading, updateRoomInList, hideRoom, markAsRead
    } = useChatStore();
    const { user } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [showUserList, setShowUserList] = useState(false);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        if (channelId) {
            fetchRooms(channelId);
            if (isAdmin) {
                axios.get(`/chat/users/${channelId}`)
                    .then(res => setUsers(res.data))
                    .catch(err => console.error('멤버 목록 로드 실패:', err));
            }
        } else {
            fetchRooms();
        }
    }, [fetchRooms, user, channelId, isAdmin]);

    // 실시간 목록 업데이트 리스너
    useEffect(() => {
        const handleRoomUpdate = (updatedRoom) => {
            if (updatedRoom.channelId === channelId || !channelId) {
                // 현재 입장 중인 방이면 unreadCount 강제 0으로 처리 (버그 수정)
                const { currentRoom } = useChatStore.getState();
                if (currentRoom?._id === updatedRoom._id) {
                    updatedRoom = {
                        ...updatedRoom,
                        unreadCountAdmin: 0,
                        unreadCountMember: 0
                    };
                }
                updateRoomInList(updatedRoom);
            }
        };
        socket.on('room_updated', handleRoomUpdate);
        return () => socket.off('room_updated');
    }, [channelId, updateRoomInList]);

    const handleSelectRoom = (room) => {
        setCurrentRoom(room);
        markAsRead(room._id);
    };

    const handleHideRoom = async (e, roomId) => {
        e.stopPropagation();
        if (window.confirm('이 대화방을 목록에서 제거하시겠습니까? (메시지는 삭제되지 않습니다)')) {
            await hideRoom(roomId);
        }
    };

    const handleCreateRoom = async (memberUserId = null) => {
        try {
            if (!channelId) return;
            const res = await axios.post('/chat/rooms', {
                memberId: memberUserId,
                channelId
            });
            await fetchRooms(channelId);
            setCurrentRoom(res.data);
            setShowUserList(false);
        } catch (error) {
            console.error('방 생성 실패:', error);
            const message = error.response?.data?.message || '대화를 시작할 수 없습니다.';
            alert(message);
        }
    };

    return (
        <div className="w-full bg-[#12121a] border-r border-white/5 flex flex-col h-full z-20 shadow-2xl">
            <div className="p-6 md:p-8 border-b border-white/5 bg-[#12121a] flex justify-between items-end h-24 md:h-28">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black font-mono tracking-tighter text-white italic leading-none mb-1">CHATS</h2>
                    <p className="text-[10px] font-bold text-[#FF8C69] uppercase tracking-[0.2em] leading-none">Messenger</p>
                </div>
                {isAdmin ? (
                    <button
                        onClick={() => setShowUserList(!showUserList)}
                        className="w-12 h-12 rounded-2xl bg-[#FF8C69] text-white flex items-center justify-center hover:bg-[#FFB5A0] transition-all shadow-xl shadow-[#FF8C69]/20 active:scale-95 border border-white/10"
                    >
                        <span className="text-2xl leading-none">{showUserList ? '×' : '+'}</span>
                    </button>
                ) : (
                    channelId && (
                        <button
                            onClick={() => handleCreateRoom()}
                            className="px-6 py-2.5 bg-[#FF8C69] text-white text-[10px] font-black rounded-xl border border-white/10 hover:bg-[#FFB5A0] transition-all uppercase tracking-widest shadow-xl shadow-[#FF8C69]/10"
                        >
                            New Talk
                        </button>
                    )
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 md:p-6 space-y-3">
                {showUserList ? (
                    <div className="absolute inset-0 bg-[#12121a] z-10 animate-in slide-in-from-right duration-300">
                        <div className="p-6 bg-white/[0.02] text-[10px] font-black text-[#6b6b8a] uppercase tracking-[0.3em] border-b border-white/5">Select Member</div>
                        {users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <span className="text-4xl mb-4">👥</span>
                                <p className="text-[11px] font-bold uppercase tracking-widest">No Members Found</p>
                            </div>
                        ) : users.map(u => (
                            <div
                                key={u._id}
                                onClick={() => handleCreateRoom(u._id)}
                                className="p-6 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-center gap-5 transition-all group"
                            >
                                <div className="relative">
                                    <UserAvatar
                                        profileImage={u.profileImage}
                                        name={u.name}
                                        size="w-12 h-12"
                                        radiusClass="rounded-2xl"
                                    />
                                    {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#06d6a0] border-[3px] border-[#12121a] rounded-full"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-white block truncate">{u.name}</span>
                                    <span className="text-[10px] text-[#444466] font-mono truncate block uppercase tracking-tighter">{u.username}</span>
                                </div>
                                <span className="text-[10px] font-bold text-[#FF8C69] opacity-0 group-hover:opacity-100 transition-opacity">START ▶</span>
                            </div>
                        ))}
                    </div>
                ) : isLoading ? (
                    <div className="p-20 text-center opacity-20">
                        <div className="w-10 h-10 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] font-mono">Syncing...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 px-10 text-center opacity-20 select-none">
                        <span className="text-6xl mb-8">🏜️</span>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] font-mono leading-relaxed">No Active<br />Conversations</p>
                    </div>
                ) : (
                    rooms.map((room) => {
                        const isUserAdmin = user?._id === room.adminId?._id || user?._id === room.adminId;
                        const otherUser = isUserAdmin ? room.memberId : room.adminId;
                        const isActive = currentRoom?._id === room._id;
                        const unreadCount = isUserAdmin ? room.unreadCountAdmin : room.unreadCountMember;
                        const isOnline = otherUser?.isOnline;

                        // 채널 브랜딩 정보
                        const channelName = room.channelId?.name || '알 수 없는 채널';
                        const channelColor = room.channelId?.cardColor || '#FF8C69';
                        const channelImage = room.channelId?.profileImage;

                        return (
                            <div
                                key={room._id}
                                onClick={() => handleSelectRoom(room)}
                                className={`group relative p-4 md:p-5 rounded-[2rem] border transition-all cursor-pointer flex items-center gap-4 ${isActive
                                    ? 'shadow-2xl translate-x-1 text-white'
                                    : 'bg-[#1a1a24] border-white/5 hover:border-white/20'
                                    }`}
                                style={isActive ? { backgroundColor: channelColor, borderColor: channelColor, boxShadow: `0 20px 40px ${channelColor}40` } : {}}
                            >
                                <div className="relative flex-shrink-0">
                                    {/* 채널 로고를 메인 아바타로 사용 */}
                                    <div className={`w-14 h-14 rounded-[1.25rem] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl ${isActive ? 'ring-2 ring-white/30' : ''}`}
                                        style={{ backgroundColor: `${channelColor}25`, borderColor: channelColor }}
                                    >
                                        {channelImage ? (
                                            <img src={channelImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black" style={{ color: channelColor }}>
                                                {channelName?.[0] || '#'}
                                            </span>
                                        )}
                                    </div>
                                    {isOnline && <span className={`absolute -bottom-1 -right-1 w-5 h-5 bg-[#06d6a0] border-[4px] rounded-full animate-pulse ${isActive ? 'border-transparent' : 'border-[#1a1a24]'}`} style={isActive ? { borderColor: channelColor } : {}}></span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20' : 'bg-white/5'}`}
                                                    style={!isActive ? { color: channelColor } : { color: 'white' }}>
                                                    {channelName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={`text-[15px] font-black truncate transition-colors ${isActive ? 'text-white' : 'text-[#e8e8f0]'}`}>
                                                    {otherUser?.name}
                                                </h3>
                                                {unreadCount > 0 && !isActive && (
                                                    <span className="bg-[#FF8C69] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-[#FF8C69]/20 min-w-[20px] text-center border border-white/10"
                                                        style={{ backgroundColor: channelColor, boxShadow: `0 5px 10px ${channelColor}40` }}>
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold font-mono uppercase mt-1 ${isActive ? 'text-white/60' : 'text-[#444466]'}`}>
                                            {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className={`text-[12px] truncate transition-colors leading-normal ${isActive ? 'text-white/80 font-bold' : 'text-[#6b6b8a] font-medium'}`}>
                                        {room.lastMessage || '대화내용없음'}
                                    </p>
                                </div>

                                {/* 방 숨기기 버튼 */}
                                <button
                                    onClick={(e) => handleHideRoom(e, room._id)}
                                    className={`absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-2xl ${isActive ? 'bg-white/20 text-white hover:bg-white hover:text-red-500' : 'bg-black text-white hover:bg-red-500'}`}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
