import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import axios from '../../api/axios';

const ChatSidebar = () => {
    const { rooms, fetchRooms, currentRoom, setCurrentRoom } = useChatStore();
    const { user } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [showUserList, setShowUserList] = useState(false);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    useEffect(() => {
        if (channelId) {
            fetchRooms(channelId);
            const isAdmin = user?.role?.toLowerCase() === 'admin';
            if (isAdmin) {
                axios.get(`/chat/users/${channelId}`)
                    .then(res => setUsers(res.data))
                    .catch(err => console.error('멤버 목록 로드 실패:', err));
            }
        } else {
            fetchRooms();
        }
    }, [fetchRooms, user, channelId]);

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
        }
    };

    return (
        <div className="w-80 bg-[#12121a] border-r border-white/5 flex flex-col h-full z-20">
            <div className="p-6 border-b border-white/5 bg-[#12121a] flex justify-between items-center h-20">
                <h2 className="text-xl font-bold font-['Bebas_Neue'] tracking-wider text-[#FF9500] italic leading-none">CHATS</h2>
                {user?.role === 'admin' ? (
                    <button
                        onClick={() => setShowUserList(!showUserList)}
                        className="w-10 h-10 rounded-xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center hover:bg-[#FF9500] hover:text-white transition-all shadow-inner active:scale-95"
                    >
                        {showUserList ? '×' : '+'}
                    </button>
                ) : (
                    channelId && (
                        <button
                            onClick={() => handleCreateRoom()}
                            className="px-4 py-2 bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-bold rounded-xl border border-[#FF9500]/20 hover:bg-[#FF9500] hover:text-white transition-all uppercase tracking-widest shadow-sm"
                        >
                            TALK
                        </button>
                    )
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {showUserList ? (
                    <div className="absolute inset-0 bg-[#12121a] z-10 animate-in slide-in-from-right duration-300">
                        <div className="p-5 bg-white/[0.02] text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.2em] border-b border-white/5">Select Member</div>
                        {users.length === 0 ? (
                            <p className="p-10 text-center text-[#3a3a4a] text-[11px] font-bold uppercase tracking-widest">No Members</p>
                        ) : users.map(u => (
                            <div
                                key={u._id}
                                onClick={() => handleCreateRoom(u._id)}
                                className="p-5 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-center gap-4 transition-all"
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 text-[#6b6b8a] flex items-center justify-center text-sm font-bold border border-white/10 group-hover:border-[#FF9500]/50 transition-colors">
                                        {u.name?.[0]}
                                    </div>
                                    {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#06d6a0] border-2 border-[#12121a] rounded-full shadow-[0_0_5px_#06d6a0]"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-[#e8e8f0] block truncate">{u.name}</span>
                                    <span className="text-[10px] text-[#444466] font-mono truncate block uppercase">{u.username}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-8 text-center opacity-20 select-none">
                        <span className="text-5xl mb-6">🏜️</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">No Active Chats</p>
                    </div>
                ) : (
                    rooms.map((room) => {
                        const otherUser = user?.role === 'admin' ? room.memberId : room.adminId;
                        const isActive = currentRoom?._id === room._id;
                        return (
                            <div
                                key={room._id}
                                onClick={() => setCurrentRoom(room)}
                                className={`p-6 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${isActive ? 'bg-[#FF9500]/5 border-[#FF9500]' : 'border-transparent hover:bg-white/5'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-[1.25rem] orange-gradient flex items-center justify-center text-sm font-bold text-white shadow-lg transition-transform ${isActive ? 'scale-110 shadow-[#FF9500]/30' : 'opacity-40 grayscale'}`}>
                                        {otherUser?.name?.[0] || '?'}
                                    </div>
                                    {otherUser?.isOnline && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#06d6a0] border-[3px] border-[#12121a] rounded-full shadow-lg"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-[#6b6b8a]'}`}>{otherUser?.name}</h3>
                                        <span className="text-[9px] font-bold font-mono text-[#3a3a4a] uppercase">
                                            {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className={`text-[11px] truncate transition-colors ${isActive ? 'text-[#d1d1e0] font-medium' : 'text-[#3a3a4a]'}`}>{room.lastMessage || '대화 내용 없음'}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
