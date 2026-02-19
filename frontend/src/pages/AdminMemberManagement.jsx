import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

const AdminMemberManagement = () => {
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();
    const { setCurrentRoom } = useChatStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
            return;
        }
        if (channelId) {
            fetchMembers();
        }
    }, [channelId, user?.role]);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/channel-members/management/${channelId}`);
            setMembers(res.data);
        } catch (error) {
            console.error('멤버 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (memberId, status) => {
        try {
            await axios.put(`/channel-members/${memberId}/status`, { status });
            fetchMembers();
        } catch (error) {
            alert('업데이트 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleStartChat = async (memberUserId) => {
        try {
            const res = await axios.post('/chat/rooms', {
                memberId: memberUserId,
                channelId: channelId
            });
            setCurrentRoom(res.data);
            navigate(`/chat?channelId=${channelId}&roomId=${res.data._id}`);
        } catch (error) {
            alert('채팅방 연결 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    if (!channelId) return (
        <div className="h-full flex items-center justify-center bg-[#1a1a24] text-[#6b6b8a] flex-col gap-4">
            <div className="w-20 h-20 bg-[#23232f] rounded-[2.5rem] flex items-center justify-center text-3xl shadow-inner">⚠️</div>
            <p className="font-bold uppercase tracking-widest text-xs">채널 정보가 없습니다.</p>
        </div>
    );

    const filteredMembers = members.filter(m => {
        if (!m.userId) return false;
        if (m.userId._id === user?._id) return false;
        const searchStr = (m.userId.name + m.userId.username).toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const pendingMembers = filteredMembers.filter(m => m.status === 'pending');
    const activeMembers = filteredMembers.filter(m => m.status === 'approved');

    if (isLoading) return (
        <div className="h-full flex items-center justify-center bg-[#1a1a24]">
            <div className="w-10 h-10 border-4 border-[#FF9500]/20 border-t-[#FF9500] rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="h-full bg-[#1a1a24] overflow-y-auto custom-scrollbar p-6 md:p-12">
            <header className="mb-12 relative">
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#FF9500] opacity-[0.03] blur-3xl rounded-full"></div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                    Member <span className="text-[#FF9500]">Management</span>
                </h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">가입 승인 및 멤버 권한 제어</p>
            </header>

            {/* 검색 섹션 */}
            <div className="mb-12 max-w-2xl relative group">
                <div className="absolute -inset-1 orange-gradient rounded-3xl blur opacity-[0.05] group-focus-within:opacity-20 transition duration-500"></div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="함께할 멤버를 찾아보세요..."
                    className="w-full bg-[#23232f] border border-white/5 rounded-2xl px-8 py-5 text-sm text-white focus:outline-none focus:border-[#FF9500]/30 transition-all shadow-2xl placeholder:text-[#3a3a4a]"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xl opacity-20">🔍</span>
            </div>

            {/* 가입 신청 섹션 */}
            {pendingMembers.length > 0 && (
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-8 bg-[#FF9500] rounded-full"></div>
                        <h2 className="text-xl font-bold text-white tracking-tight italic">Waiting for Approval</h2>
                        <span className="bg-[#FF9500]/10 text-[#FF9500] px-3 py-1 rounded-full text-[10px] font-black">{pendingMembers.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingMembers.map(m => (
                            <div key={m._id} className="bg-[#23232f] border border-white/5 rounded-[2rem] p-8 shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF9500]/5 rounded-bl-[4rem] group-hover:bg-[#FF9500]/10 transition-colors"></div>
                                <div className="relative z-10">
                                    <div className="w-14 h-14 orange-gradient rounded-2xl flex items-center justify-center text-xl text-white font-bold mb-6 shadow-lg shadow-[#FF9500]/20">
                                        {m.userId?.name?.[0]}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#FF9500] transition-colors">{m.userId?.name}</h3>
                                    <p className="text-[10px] text-[#5a5a6a] font-mono uppercase tracking-widest mb-8">{m.userId?.username}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus(m._id, 'approved')}
                                            className="flex-1 py-3 bg-[#FF9500] text-white text-[10px] font-black rounded-xl shadow-lg shadow-[#FF9500]/20 hover:scale-105 transition-transform uppercase tracking-widest"
                                        >
                                            승인하기
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(m._id, 'rejected')}
                                            className="flex-1 py-3 bg-[#1a1a24] text-[#FF9500] border border-[#FF9500]/20 text-[10px] font-black rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all uppercase tracking-widest"
                                        >
                                            거절
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 멤버 목록 섹션 */}
            <section>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-8 bg-[#06d6a0] rounded-full"></div>
                    <h2 className="text-xl font-bold text-white tracking-tight italic">Active Members</h2>
                    <span className="bg-[#06d6a0]/10 text-[#06d6a0] px-3 py-1 rounded-full text-[10px] font-black">{activeMembers.length}</span>
                </div>
                <div className="bg-[#23232f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-10 py-6 text-[10px] font-black text-[#444466] uppercase tracking-[0.3em]">User Identity</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-[#444466] uppercase tracking-[0.3em]">Connection</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-[#444466] uppercase tracking-[0.3em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeMembers.map(m => (
                                    <tr key={m._id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-[1rem] bg-white/5 border border-white/5 flex items-center justify-center text-sm font-bold text-[#6b6b8a] group-hover:bg-[#FF9500]/10 group-hover:text-[#FF9500] group-hover:border-[#FF9500]/20 transition-all">
                                                    {m.userId?.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{m.userId?.name}</p>
                                                    <p className="text-[10px] text-[#444466] font-mono uppercase tracking-tighter">{m.userId?.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${m.userId?.isOnline ? 'bg-[#06d6a0] shadow-[0_0_10px_#06d6a0]' : 'bg-[#3a3a4a]'}`}></span>
                                                <span className={`text-[10px] font-black font-mono tracking-widest italic leading-none ${m.userId?.isOnline ? 'text-[#06d6a0]' : 'text-[#3a3a4a]'}`}>
                                                    {m.userId?.isOnline ? 'LIVE' : 'IDLE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStartChat(m.userId?._id)}
                                                    className="px-5 py-2.5 bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-black rounded-xl hover:bg-[#FF9500] hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-[#FF9500]/5"
                                                >
                                                    Chat
                                                </button>
                                                <button
                                                    onClick={() => { if (window.confirm('정말 추방하시겠습니까?')) handleUpdateStatus(m._id, 'kicked'); }}
                                                    className="px-5 py-2.5 bg-red-500/5 text-red-500 text-[10px] font-black rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
                                                >
                                                    Kick
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {activeMembers.length === 0 && (
                        <div className="p-20 text-center opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] font-mono italic">No active members found</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AdminMemberManagement;
