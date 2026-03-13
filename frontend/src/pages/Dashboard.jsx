import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useChatStore from '../store/chatStore';
import useNotificationStore from '../store/notificationStore';
import ChannelCreateModal from '../components/Common/ChannelCreateModal';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { myChannels, fetchMyChannels, isLoading, setCurrentChannel } = useChannelStore();
    const { rooms, fetchRooms } = useChatStore();
    const { notifications, pendingCounts, unreadCounts, fetchUnreadCounts } = useNotificationStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const location = useLocation();
    const autoOpenedDmRef = useRef(false);

    const totalPending = Object.values(pendingCounts || {}).reduce((s, n) => s + n, 0);
    const totalUnread = Object.values(unreadCounts || {}).reduce((acc, counts) => {
        if (!counts) return acc;
        return acc + (Number(counts.notice) || 0) + (Number(counts.post) || 0) + (Number(counts.chat) || 0) + (Number(counts.poll) || 0);
    }, 0);

    useEffect(() => {
        if (user?._id) {
            fetchMyChannels();
            fetchUnreadCounts();
            if (user.role === 'superadmin') {
                fetchStats();
            } else {
                fetchRooms();
            }
        }
        setCurrentChannel(null);
    }, [user?._id, fetchMyChannels, setCurrentChannel, user?.role, fetchUnreadCounts, fetchRooms]);

    const superAdminRoom = useMemo(() => {
        if (user?.role === 'superadmin') return null;
        return rooms.find((room) => {
            const isSuperAdminDm = room?.channelId?.name === '__SUPERADMIN_DM__';
            const hasSuperAdminAsOtherSide = room?.adminId?.role === 'superadmin';
            return isSuperAdminDm && hasSuperAdminAsOtherSide;
        }) || null;
    }, [rooms, user?.role]);

    useEffect(() => {
        if (!superAdminRoom || user?.role === 'superadmin') return;
        if (location.pathname !== '/') return;

        const isUserAdminInRoom =
            user?._id === superAdminRoom.adminId?._id || user?._id === superAdminRoom.adminId;
        const unread = isUserAdminInRoom
            ? Number(superAdminRoom.unreadCountAdmin || 0)
            : Number(superAdminRoom.unreadCountMember || 0);

        if (unread > 0 && !autoOpenedDmRef.current) {
            autoOpenedDmRef.current = true;
            navigate(`/chat?roomId=${superAdminRoom._id}`);
        }
    }, [superAdminRoom, user?._id, user?.role, navigate, location.pathname]);

    const fetchStats = async () => {
        setIsStatsLoading(true);
        try {
            const { data } = await axios.get('/superadmin/stats');
            setStats(data);
        } catch (error) {
            console.error('Fetch stats failed:', error);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleChannelClick = (channel) => {
        setCurrentChannel(channel);
        navigate(`/notices?channelId=${channel._id}`);
    };

    const renderSuperAdminStats = () => {
        if (isStatsLoading) return <div className="p-10 text-center animate-pulse text-[#FF8C69] font-bold">지표 데이터를 불러오는 중...</div>;
        if (!stats) return <div className="p-10 text-center text-[#6b6b8a]">표시할 통계 데이터가 없습니다.</div>;

        return (
            <>
                <div className="glass-card p-8 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl group-hover:scale-125 transition-transform text-[#FF8C69]">👤</div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">오늘 가입 신규 유저</h3>
                    <p className="text-5xl font-black text-white leading-none">{stats.today.newUsers}<span className="text-sm font-bold text-[#FF8C69] ml-2">명</span></p>
                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#06d6a0] bg-[#06d6a0]/10 px-3 py-1 rounded-full border border-[#06d6a0]/20">↑ 상승 중</span>
                        <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalUsers}</span>
                    </div>
                </div>
                <div className="glass-card p-8 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl group-hover:scale-125 transition-transform text-[#FF8C69]">🏘️</div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">오늘 개설 신규 채널</h3>
                    <p className="text-5xl font-black text-white leading-none">{stats.today.newChannels}<span className="text-sm font-bold text-[#FF8C69] ml-2">개</span></p>
                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#FF8C69] bg-[#FF8C69]/10 px-3 py-1 rounded-full border border-[#FF8C69]/20">+ 확장 중</span>
                        <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalChannels}</span>
                    </div>
                </div>
                <div className="glass-card p-8 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl group-hover:scale-125 transition-transform text-purple-400">📋</div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">오늘 등록 신규 게시글</h3>
                    <p className="text-5xl font-black text-white leading-none">{stats.today.newPosts}<span className="text-sm font-bold text-purple-400 ml-2">개</span></p>
                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">💬 활성</span>
                        <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalPosts}</span>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="page-container p-6 md:p-10 pb-24 md:pb-10 pt-safe">
            <header className="flex justify-between items-end mb-12 animate-slide-up">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-[#FF8C69]/10 text-[#FF8C69] text-[10px] font-bold rounded-full border border-[#FF8C69]/20 tracking-widest uppercase">
                            {user?.role === 'superadmin' ? 'System Master' : 'Online'}
                        </span>
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                            {user?.role === 'superadmin' ? 'Terminal Control' : 'Network Connect'}
                        </h2>
                    </div>
                    <h2 className="text-3xl font-black text-white/95 tracking-tight">
                        반가워요, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C69] to-[#E8735A]">{user?.role === 'superadmin' ? '최고관리자' : (user?.name || user?.username)}</span>님 🍑
                    </h2>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="peach-button"
                    >
                        <span className="text-xl">+</span>
                    </button>
                )}
            </header>

            {user?.role === 'superadmin' ? (
                <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-3 mb-8">
                        <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full shadow-[0_0_10px_#FF8C69]"></span> 시스템 실시간 지표
                    </h2>
                    <div className="bento-grid !p-0 !gap-6">
                        {renderSuperAdminStats()}
                    </div>
                </section>
            ) : (
                <div className="space-y-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {superAdminRoom && (
                        <section>
                            <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-3 mb-6">
                                <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full animate-pulse shadow-[0_0_10px_#FF8C69]"></span> 관리자 전용 채팅
                            </h2>
                            <div
                                onClick={() => navigate(`/chat?roomId=${superAdminRoom._id}`)}
                                className="glass-card p-8 cursor-pointer group border border-[#FF8C69]/20"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF8C69]">SUPERADMIN DIRECT CHAT</p>
                                        <h3 className="mt-3 text-2xl font-black text-white">최고관리자 대화 요청이 도착했습니다</h3>
                                        <p className="mt-2 text-sm text-[#8b8ba7]">
                                            채널 가입 여부와 상관없이 이 화면에서 바로 대화를 확인할 수 있습니다.
                                        </p>
                                    </div>
                                    <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {(notifications.length > 0 || totalPending > 0 || totalUnread > 0) && (
                        <section>
                            <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-3 mb-6">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></span> 신규 업데이트
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {user?.role === 'admin' && totalPending > 0 && (
                                    <div
                                        onClick={() => {
                                            const adminChannel = myChannels.find(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id);
                                            navigate(`/admin/members?channelId=${adminChannel?.channelId?._id || myChannels[0]?.channelId?._id}`);
                                        }}
                                        className="glass-card p-8 bg-gradient-to-br from-[#FF8C69]/20 to-transparent cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">운영 센터</span>
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2">가입 신청 {totalPending}건</h3>
                                        <p className="text-slate-400 text-xs font-medium mb-6">새로운 멤버가 승인을 기다리고 있습니다.</p>
                                        <div className="text-[9px] font-black text-[#FF8C69] uppercase tracking-widest py-2 px-4 bg-white/5 rounded-full w-fit group-hover:bg-[#FF8C69] group-hover:text-white transition-all">
                                            관리 도구 열기
                                        </div>
                                    </div>
                                )}
                                {myChannels.map(membership => {
                                    const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                    const counts = unreadCounts[chId] || { notice: 0, post: 0, chat: 0, poll: 0 };
                                    const sum = (counts.notice || 0) + (counts.post || 0) + (counts.chat || 0) + (counts.poll || 0);
                                    if (sum === 0) return null;
                                    return (
                                        <div
                                            key={`summary-${chId}`}
                                            onClick={() => {
                                                setCurrentChannel(membership.channelId);
                                                if (counts.chat > 0) navigate(`/chat?channelId=${chId}`);
                                                else if (counts.notice > 0) navigate(`/notices?channelId=${chId}`);
                                                else if (counts.poll > 0) navigate(`/polls?channelId=${chId}`);
                                                else navigate(`/board?channelId=${chId}`);
                                            }}
                                            className="glass-card p-6 flex items-center gap-4 cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden glass-card !p-0 shadow-inner flex-shrink-0">
                                                {membership.channelId?.profileImage ? (
                                                    <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl bg-white/5">🏘️</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate group-hover:text-[#FF8C69] transition-colors">{membership.channelId?.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {sum > 0 && <span className="text-[10px] font-black text-[#FF8C69] animate-pulse">NEW CONTENT +{sum}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-3 mb-8">
                            <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full shadow-[0_0_10px_#FF8C69]"></span> 나의 채널
                        </h2>
                        {isLoading ? (
                            <div className="bento-grid !p-0">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 glass-card animate-pulse"></div>
                                ))}
                            </div>
                        ) : myChannels.length === 0 ? (
                            <div className="glass-card p-20 text-center border-dashed border-white/10">
                                <div className="text-5xl mb-6">🏝️</div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">가입된 채널이 없습니다.</p>
                                {user?.role === 'admin' && (
                                    <button onClick={() => setIsModalOpen(true)} className="peach-button mt-8">새 채널 개설</button>
                                )}
                            </div>
                        ) : (
                            <div className="bento-grid !p-0">
                                {myChannels.map((membership) => (
                                    <div
                                        key={membership.channelId?._id}
                                        onClick={() => handleChannelClick(membership.channelId)}
                                        className="glass-card p-8 flex flex-col h-full group"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden glass-card !p-0 shadow-inner">
                                                {membership.channelId?.profileImage ? (
                                                    <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl bg-white/5">🏘️</div>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${membership.status === 'approved' ? 'border-[#06d6a0]/30 text-[#06d6a0] bg-[#06d6a0]/5' : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
                                                } uppercase tracking-tighter`}>
                                                {membership.status === 'approved' ? 'Active' : 'Pending'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#FF8C69] transition-colors truncate">{membership.channelId?.name}</h3>
                                        <p className="text-slate-500 text-xs line-clamp-2 h-10 leading-relaxed font-medium mb-8">{membership.channelId?.description}</p>
                                        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${membership.channelId?.ownerId?.isOnline ? 'bg-[#06d6a0]' : 'bg-slate-700'}`}></div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Admin {membership.channelId?.ownerId?.isOnline ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <div className="text-[10px] font-black text-[#FF8C69] uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Enter <span>→</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {user?.role === 'admin' && (
                        <section className="mt-20 mb-32">
                            <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-3 mb-8">
                                <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full shadow-[0_0_10px_#FF8C69]"></span> 채널 대화 스테이션
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {myChannels.filter(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id).map(membership => {
                                    const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                    const chatCount = unreadCounts[chId]?.chat || 0;
                                    return (
                                        <div
                                            key={`chat-card-${chId}`}
                                            onClick={() => {
                                                setCurrentChannel(membership.channelId);
                                                navigate(`/chat?channelId=${chId}`);
                                            }}
                                            className="glass-card p-8 group cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-8xl group-hover:scale-125 transition-transform text-[#FF8C69]">💬</div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl glass-card !p-0 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🏘️</div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white tracking-tight">{membership.channelId?.name}</h3>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">대화방 입장</p>
                                                    </div>
                                                </div>
                                                {chatCount > 0 && (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="px-3 py-1 bg-red-500 text-white text-[9px] font-black rounded-full animate-bounce shadow-lg shadow-red-500/20">NEW</span>
                                                        <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">{chatCount} Messages</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Communication Hub</span>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-[#FF8C69] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                                                    Connect <span>→</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            )}
            <ChannelCreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default Dashboard;
