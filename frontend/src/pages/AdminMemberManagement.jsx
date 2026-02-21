import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import useNotificationStore from '../store/notificationStore';

const AdminMemberManagement = () => {
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuthStore();
    const { setCurrentRoom } = useChatStore();
    const { decrementPendingCount } = useNotificationStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user?.role !== 'admin' && user?.role !== 'superadmin') {
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
            // 만약 모달이 열려있다면 데이터 갱신
            if (selectedMember) {
                const updated = res.data.find(m => m._id === selectedMember._id);
                if (updated) setSelectedMember(updated);
            }
        } catch (error) {
            console.error('멤버 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (memberId, status, currentStatus) => {
        try {
            await axios.put(`/channel-members/${memberId}/status`, { status });
            // pending 상태에서 승인/거절 시 뱃지 감소
            if (currentStatus === 'pending' && (status === 'approved' || status === 'rejected')) {
                decrementPendingCount(channelId);
            }
            fetchMembers();
            if (isModalOpen) setIsModalOpen(false);
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

    const openMemberDetail = (member) => {
        setSelectedMember(member);
        setIsModalOpen(true);
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
    const activeMembers = filteredMembers.filter(m => m.status !== 'pending' && m.status !== 'rejected');

    if (isLoading && members.length === 0) return (
        <div className="h-full flex items-center justify-center bg-[#1a1a24]">
            <div className="w-10 h-10 border-4 border-[#FF8C69]/20 border-t-[#FF8C69] rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="h-full bg-[#1a1a24] overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32">
            <header className="mb-12 relative">
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#FF8C69] opacity-[0.03] blur-3xl rounded-full"></div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                    Member <span className="text-[#FF8C69]">Management</span>
                </h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">가입 승인 및 멤버 권한 제어</p>
            </header>


            {/* 가입 신청 섹션 (강조됨) */}
            <section className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-8 bg-[#FF8C69] rounded-full"></div>
                    <h2 className="text-xl font-bold text-white tracking-tight italic">Waiting for Approval</h2>
                    <span className="bg-[#FF8C69]/10 text-[#FF8C69] px-3 py-1 rounded-full text-[10px] font-black">{pendingMembers.length}</span>
                </div>

                {pendingMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingMembers.map(m => (
                            <div
                                key={m._id}
                                onClick={() => openMemberDetail(m)}
                                className="bg-[#23232f] border border-[#FF8C69]/20 rounded-[2rem] p-8 shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden cursor-pointer"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF8C69]/10 rounded-bl-[4rem]"></div>
                                <div className="absolute top-4 right-4 text-[10px] font-black text-[#FF8C69] bg-[#FF8C69]/10 px-3 py-1 rounded-full animate-pulse">NEW</div>
                                <div className="relative z-10">
                                    <div className="w-14 h-14 orange-gradient rounded-2xl flex items-center justify-center text-xl text-white font-bold mb-6 shadow-lg shadow-[#FF8C69]/20">
                                        {m.userId?.name?.[0]}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#FF8C69] transition-colors">{m.userId?.name}</h3>
                                    <p className="text-[10px] text-[#5a5a6a] font-mono uppercase tracking-widest mb-8">{m.userId?.username}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(m._id, 'approved', m.status); }}
                                            className="flex-1 py-3 bg-[#FF8C69] text-white text-[10px] font-black rounded-xl shadow-lg shadow-[#FF8C69]/20 hover:scale-105 transition-transform uppercase tracking-widest"
                                        >
                                            승인하기
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(m._id, 'rejected', m.status); }}
                                            className="flex-1 py-3 bg-[#1a1a24] text-[#FF8C69] border border-[#FF8C69]/20 text-[10px] font-black rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all uppercase tracking-widest"
                                        >
                                            거절
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-widest">새로운 가입 신청이 없습니다.</p>
                    </div>
                )}
            </section>


            {/* 검색 섹션 */}
            <div className="mb-12 max-w-2xl relative group">
                <div className="absolute -inset-1 orange-gradient rounded-3xl blur opacity-[0.05] group-focus-within:opacity-20 transition duration-500 pointer-events-none"></div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="검색할 멤버의 이름을 입력하세요..."
                    className="w-full bg-[#23232f] border border-white/5 rounded-2xl px-8 py-5 text-sm text-white focus:outline-none focus:border-[#FF8C69]/30 transition-all shadow-2xl placeholder:text-[#3a3a4a] relative z-10"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xl opacity-20 z-20">🔍</span>
            </div>

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
                                    <th className="px-10 py-6 text-[10px] font-black text-[#444466] uppercase tracking-[0.3em]">Status & Connection</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-[#444466] uppercase tracking-[0.3em] text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeMembers.map(m => (
                                    <tr
                                        key={m._id}
                                        onClick={() => openMemberDetail(m)}
                                        className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-[1rem] bg-white/5 border border-white/5 flex items-center justify-center text-sm font-bold text-[#6b6b8a] group-hover:bg-[#FF8C69]/10 group-hover:text-[#FF8C69] group-hover:border-[#FF8C69]/20 transition-all">
                                                    {m.userId?.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{m.userId?.name}</p>
                                                    <p className="text-[10px] text-[#444466] font-mono uppercase tracking-tighter">{m.userId?.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${m.userId?.isOnline ? 'bg-[#06d6a0] shadow-[0_0_10px_#06d6a0]' : 'bg-[#3a3a4a]'}`}></span>
                                                    <span className={`text-[10px] font-black font-mono tracking-widest italic leading-none ${m.userId?.isOnline ? 'text-[#06d6a0]' : 'text-[#3a3a4a]'}`}>
                                                        {m.userId?.isOnline ? 'LIVE' : 'IDLE'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.status === 'approved' ? 'bg-[#06d6a0]/10 text-[#06d6a0]' :
                                                        m.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {m.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button className="text-xl opacity-20 group-hover:opacity-100 group-hover:text-[#FF8C69] transition-all">➔</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* 멤버 상세 모달 */}
            {isModalOpen && selectedMember && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-6">
                    <div
                        className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-md"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    <div className="relative w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                            <span className="text-8xl font-black italic uppercase font-mono leading-none text-white">DETAIL</span>
                        </div>

                        <div className="p-10 pt-12">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-20 h-20 orange-gradient rounded-3xl flex items-center justify-center text-3xl text-white font-bold shadow-2xl shadow-[#FF8C69]/30">
                                    {selectedMember.userId?.name?.[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-black text-white">{selectedMember.userId?.name}</h2>
                                        <span className={`w-2 h-2 rounded-full ${selectedMember.userId?.isOnline ? 'bg-[#06d6a0]' : 'bg-[#3a3a4a]'}`}></span>
                                    </div>
                                    <p className="text-xs font-mono text-[#6b6b8a] uppercase tracking-widest">{selectedMember.userId?.username}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-[#444466] uppercase tracking-widest mb-2">가입상태</p>
                                    <p className="text-sm font-bold text-white uppercase">{selectedMember.status}</p>
                                </div>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-[#444466] uppercase tracking-widest mb-2">가입일시</p>
                                    <p className="text-sm font-bold text-white">{new Date(selectedMember.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-[#444466] uppercase tracking-widest mb-2">채팅권한</p>
                                    <p className={`text-sm font-bold ${selectedMember.isChatBlocked ? 'text-red-500' : 'text-[#06d6a0]'}`}>
                                        {selectedMember.isChatBlocked ? '차단됨' : '정상'}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-[#444466] uppercase tracking-widest mb-2">마지막 활동</p>
                                    <p className="text-sm font-bold text-white">최근</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleStartChat(selectedMember.userId?._id)}
                                        className="flex-1 py-4 bg-[#FF8C69] text-white text-[11px] font-black rounded-2xl shadow-xl shadow-[#FF8C69]/20 active:scale-95 transition-all uppercase tracking-widest"
                                    >
                                        💬 1:1 대화하기
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {selectedMember.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedMember._id, 'approved', 'pending')}
                                                className="py-4 bg-[#06d6a0] text-white text-[11px] font-black rounded-2xl active:scale-95 transition-all uppercase"
                                            >
                                                ✅ 가입 승인
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedMember._id, 'rejected', 'pending')}
                                                className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 text-[11px] font-black rounded-2xl active:scale-95 transition-all uppercase"
                                            >
                                                ❌ 거절
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const nextStatus = selectedMember.status === 'suspended' ? 'approved' : 'suspended';
                                                    handleUpdateStatus(selectedMember._id, nextStatus);
                                                }}
                                                className={`py-4 ${selectedMember.status === 'suspended' ? 'bg-[#06d6a0]' : 'bg-yellow-500'} text-white text-[11px] font-black rounded-2xl active:scale-95 transition-all uppercase`}
                                            >
                                                {selectedMember.status === 'suspended' ? '🔓 정지 해제' : '⏸ 서비스 휴정'}
                                            </button>
                                            <button
                                                onClick={() => { if (window.confirm('정말 탈퇴(추방) 처리하시겠습니까?')) handleUpdateStatus(selectedMember._id, 'withdrawn'); }}
                                                className="py-4 bg-red-500 text-white text-[11px] font-black rounded-2xl active:scale-95 transition-all uppercase"
                                            >
                                                🚫 멤버 탈퇴
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-4 bg-white/5 text-[#6b6b8a] text-[11px] font-bold rounded-2xl hover:bg-white/10 transition-all uppercase"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMemberManagement;
