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
    }, [channelId, user]);

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
            alert('상태가 업데이트되었습니다.');
        } catch (error) {
            alert('업데이트 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleToggleChatBlock = async (memberId, isBlocked) => {
        try {
            await axios.put(`/channel-members/${memberId}/status`, { isChatBlocked: isBlocked });
            fetchMembers();
        } catch (error) {
            alert('설정 변경 실패');
        }
    };

    const handleStartChat = async (memberUserId) => {
        try {
            const res = await axios.post('/chat/rooms', {
                memberId: memberUserId,
                channelId: channelId
            });
            setCurrentRoom(res.data);
            navigate(`/chat?channelId=${channelId}`);
        } catch (error) {
            alert('채팅방 연결 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    if (!channelId) return <div className="p-8 text-center opacity-50 font-mono uppercase tracking-widest">채널 ID가 없습니다.</div>;

    // 회원 필터링: 관리자 본인 제외 및 검색어 필터링
    const filteredMembers = members.filter(m => {
        if (!m.userId) return false;
        if (m.userId._id === user?._id) return false;

        const searchStr = (m.userId.name + m.userId.username).toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const pendingMembers = filteredMembers.filter(m => m.status === 'pending');
    const activeMembers = filteredMembers.filter(m => m.status === 'approved');
    const restrictedMembers = filteredMembers.filter(m => ['rejected', 'kicked'].includes(m.status));

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-bold font-['Bebas_Neue'] tracking-wider mb-2 uppercase italic text-[#4f6ef7]">MEMBER <span className="text-white">MANAGEMENT</span></h1>
                <p className="text-[#a0a0c0] text-[10px] font-mono tracking-[0.3em] uppercase ml-1">채널 멤버 권한 및 가입 승인 관리</p>
            </header>

            {/* 회원 검색 바 */}
            <div className="mb-10 max-w-xl relative group">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="회원 이름 또는 이메일 검색..."
                    className="w-full bg-[#12121a] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#4f6ef7]/50 transition-all shadow-xl"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>

            {/* 가입 신청 대기 - Pending */}
            <section className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-[#ff9f1c]">가입 승인 대기</h2>
                    <span className="bg-[#ff9f1c]/10 text-[#ff9f1c] px-2 py-0.5 rounded text-[10px] font-bold">{pendingMembers.length}</span>
                </div>
                {pendingMembers.length === 0 ? (
                    <p className="bg-[#12121a] border border-white/5 rounded-2xl p-8 text-center text-xs text-[#444466]">대기 중인 신청이 없습니다.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingMembers.map(m => (
                            <div key={m._id} className="bg-[#12121a] border border-[rgba(255,159,28,0.2)] rounded-2xl p-6 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-white mb-1">{m.userId?.name}</p>
                                    <p className="text-xs text-[#6b6b8a] font-mono">{m.userId?.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateStatus(m._id, 'approved')}
                                        className="px-4 py-2 bg-[#06d6a0] text-black text-[10px] font-bold rounded-lg hover:bg-[#05b386]"
                                    >
                                        승인
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(m._id, 'rejected')}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white"
                                    >
                                        거절
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 활동 멤버 - Active */}
            <section className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-[#06d6a0]">현재 활동 멤버</h2>
                    <span className="bg-[#06d6a0]/10 text-[#06d6a0] px-2 py-0.5 rounded text-[10px] font-bold">{activeMembers.length}</span>
                </div>
                <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1a1a28] text-[10px] font-mono uppercase tracking-widest text-[#444466]">
                            <tr>
                                <th className="px-6 py-4">이름 / 이메일</th>
                                <th className="px-6 py-4">접속 상태</th>
                                <th className="px-6 py-4">가입일</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activeMembers.map(m => (
                                <tr key={m._id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#4f6ef7]/10 text-[#4f6ef7] flex items-center justify-center text-[10px] font-bold border border-[#4f6ef7]/20 uppercase">
                                                {m.userId?.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-xs">{m.userId?.name}</p>
                                                <p className="text-[10px] text-[#444466] font-mono">{m.userId?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${m.userId?.isOnline ? 'bg-[#06d6a0] shadow-[0_0_8px_rgba(6,214,160,0.6)]' : 'bg-gray-600'}`}></span>
                                            <span className={`text-[10px] font-bold font-mono tracking-tighter uppercase ${m.userId?.isOnline ? 'text-[#06d6a0]' : 'text-[#444466]'}`}>
                                                {m.userId?.isOnline ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] font-mono text-[#6b6b8a]">
                                        {new Date(m.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-4 mt-2">
                                        <button
                                            onClick={() => handleStartChat(m.userId?._id)}
                                            className="px-3 py-1.5 bg-[#4f6ef7]/10 text-[#4f6ef7] border border-[#4f6ef7]/20 text-[9px] font-bold rounded-lg hover:bg-[#4f6ef7] hover:text-white transition-all uppercase"
                                        >
                                            1:1 채팅
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm('정말 추방하시겠습니까?')) handleUpdateStatus(m._id, 'kicked'); }}
                                            className="text-red-500/50 hover:text-red-500 transition-colors text-[10px] font-bold uppercase"
                                        >
                                            추방
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {activeMembers.length === 0 && <p className="p-8 text-center text-xs text-[#444466]">멤버가 없습니다.</p>}
                </div>
            </section>
        </div>
    );
};

export default AdminMemberManagement;
