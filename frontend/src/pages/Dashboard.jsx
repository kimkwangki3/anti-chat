import { useEffect, useState } from 'react';
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
    const { notifications, pendingCounts, unreadCounts, fetchUnreadCounts } = useNotificationStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);

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
            }
        }
        setCurrentChannel(null);
    }, [user?._id, fetchMyChannels, setCurrentChannel, user?.role, fetchUnreadCounts]);

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
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-[#23232f] p-8 rounded-[2.5rem] border border-[#FF8C69]/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-125 transition-transform text-[#FF8C69]">👤</div>
                        <h3 className="text-[10px] font-black text-[#6b6b8a] uppercase tracking-[0.3em] mb-4">오늘 가입 신규 유저</h3>
                        <p className="text-5xl font-black text-white leading-none">{stats.today.newUsers}<span className="text-sm font-bold text-[#FF8C69] ml-2">명</span></p>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#06d6a0] bg-[#06d6a0]/10 px-3 py-1 rounded-full border border-[#06d6a0]/20">↑ 상승 중</span>
                            <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalUsers}</span>
                        </div>
                    </div>
                    <div className="bg-[#23232f] p-8 rounded-[2.5rem] border border-[#FF8C69]/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-125 transition-transform text-[#FF8C69]">🏘️</div>
                        <h3 className="text-[10px] font-black text-[#6b6b8a] uppercase tracking-[0.3em] mb-4">오늘 개설 신규 채널</h3>
                        <p className="text-5xl font-black text-white leading-none">{stats.today.newChannels}<span className="text-sm font-bold text-[#FF8C69] ml-2">개</span></p>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#FF8C69] bg-[#FF8C69]/10 px-3 py-1 rounded-full border border-[#FF8C69]/20">+ 확장 중</span>
                            <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalChannels}</span>
                        </div>
                    </div>
                    <div className="bg-[#23232f] p-8 rounded-[2.5rem] border border-purple-500/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-125 transition-transform text-purple-400">📋</div>
                        <h3 className="text-[10px] font-black text-[#6b6b8a] uppercase tracking-[0.3em] mb-4">오늘 등록 신규 게시글</h3>
                        <p className="text-5xl font-black text-white leading-none">{stats.today.newPosts}<span className="text-sm font-bold text-purple-400 ml-2">개</span></p>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">💬 활성</span>
                            <span className="text-[10px] font-bold text-[#444466]">전체: {stats.total.totalPosts}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#23232f]/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl">🌐</div>
                            <div>
                                <p className="text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">네트워크 상태</p>
                                <p className="text-sm font-bold text-white">모든 시스템 정상 작동 중</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-[#06d6a0] uppercase tracking-tighter">지연 시간</p>
                            <p className="text-sm font-mono font-bold text-white">24ms</p>
                        </div>
                    </div>
                    <div className="bg-[#23232f]/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl">🔒</div>
                            <div>
                                <p className="text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">보안 상태</p>
                                <p className="text-sm font-bold text-white">PeachShield로 보호됨</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-[#FF8C69] uppercase tracking-tighter">가동 시간</p>
                            <p className="text-sm font-mono font-bold text-white">99.9%</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-full bg-[#1a1a24] text-[#e8e8f0] p-6 md:p-10 pb-24 md:pb-10 pt-safe font-inter">
            <header className="flex justify-between items-end mb-12">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1 px-2 bg-[#FF8C69]/10 text-[#FF8C69] text-[10px] font-bold rounded-md border border-[#FF8C69]/20 font-mono italic">
                            {user?.role === 'superadmin' ? '최고 관리자 권한' : '온라인'}
                        </span>
                        <h2 className="text-xs font-bold text-[#6b6b8a] uppercase tracking-widest font-mono italic">
                            {user?.role === 'superadmin' ? '시스템 제어 터미널' : '엔터프라이즈 커넥트'}
                        </h2>
                    </div>
                    <h2 className="text-2xl font-black text-white/90">
                        반가워요, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{user?.role === 'superadmin' ? '최고관리자' : (user?.name || user?.username)}</span>님 🍑
                    </h2>
                    {/* TEMP DEBUG LOG */}
                    <p className="text-[#a1a1aa] text-sm hidden">
                    </p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-4 bg-[#FF8C69] text-white font-bold rounded-2xl hover:bg-[#FFB5A0] transition-all shadow-lg shadow-[#FF8C69]/20 flex items-center gap-2 active:scale-95"
                    >
                        <span className="text-xl">+</span>
                    </button>
                )}
            </header>

            {user?.role === 'superadmin' ? (
                <section className="mb-14">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2 mb-8">
                        <span className="w-2 h-2 bg-[#FF8C69] rounded-full"></span> 시스템 실시간 지표 (MASTER)
                    </h2>
                    {renderSuperAdminStats()}
                </section>
            ) : (
                <>
                    {(notifications.length > 0 || totalPending > 0 || totalUnread > 0) && (
                        <section className="mb-10">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2 mb-5">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> 새로운 소식
                            </h2>
                            <div className="space-y-3">
                                {user?.role === 'admin' && totalPending > 0 && (
                                    <div className="space-y-4">
                                        <div
                                            onClick={() => {
                                                const adminChannel = myChannels.find(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id);
                                                navigate(`/admin/members?channelId=${adminChannel?.channelId?._id || myChannels[0]?.channelId?._id}`);
                                            }}
                                            className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-[#FF8C69] to-[#E8735A] shadow-2xl shadow-[#FF8C69]/30 cursor-pointer hover:scale-[1.02] transition-all group overflow-hidden"
                                        >
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
                                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em]">채널 운영 센터</span>
                                                </div>
                                                <h3 className="text-2xl font-black text-white mb-2">
                                                    신규 가입 신청 {totalPending}건
                                                </h3>
                                                <p className="text-white/80 text-sm font-bold">
                                                    운영 중인 채널에 새로운 멤버의 가입 신청이 있습니다. 지금 바로 승인하세요!
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest bg-black/20 w-fit px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-[#FF8C69] transition-colors">
                                                매니지먼트 접속 <span className="text-[8px]">▶</span>
                                            </div>
                                        </div>


                                        {myChannels.map(membership => {
                                            const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                            const counts = unreadCounts[chId] || { notice: 0, post: 0, chat: 0, poll: 0 };
                                            const sum = (counts.notice || 0) + (counts.post || 0) + (counts.chat || 0) + (counts.poll || 0);
                                            if (sum === 0) return null;
                                            const themeColor = membership.channelId?.cardColor || '#FF8C69';
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
                                                    className="flex items-center gap-4 p-5 bg-[#23232f] border rounded-3xl cursor-pointer transition-all group shadow-xl"
                                                    style={{ borderColor: `${themeColor}1A` }}
                                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = `${themeColor}4D`}
                                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = `${themeColor}1A`}
                                                >
                                                    {membership.channelId?.profileImage ? (
                                                        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                                                            <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0"
                                                            style={{
                                                                backgroundColor: `${themeColor}1A`,
                                                                color: themeColor
                                                            }}
                                                        >🏘️</div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{membership.channelId?.name}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {(Number(counts.notice) > 0) && <span className="text-[10px] text-purple-400 font-bold flex items-center gap-1">📢 {counts.notice}</span>}
                                                            {(Number(counts.post) > 0) && <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">📋 {counts.post}</span>}
                                                            {(Number(counts.poll) > 0) && <span className="text-[10px] text-[#06d6a0] font-bold flex items-center gap-1">🗳️ {counts.poll}</span>}
                                                            {(Number(counts.chat) > 0) && <span className="text-[10px] font-bold flex items-center gap-1 animate-pulse" style={{ color: themeColor }}>💬 {counts.chat}</span>}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg"
                                                        style={{
                                                            backgroundColor: themeColor,
                                                            boxShadow: `0 4px 12px ${themeColor}40`
                                                        }}
                                                    >+{sum}</span>
                                                </div>
                                            );
                                        })}
                                        {notifications.slice(0, 3).map(noti => (
                                            <div
                                                key={noti.id}
                                                onClick={() => navigate(noti.path)}
                                                className="flex items-center gap-4 p-4 bg-[#23232f]/50 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition-all opacity-70 hover:opacity-100"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                                                    {noti.type === 'notice' ? '📢' : noti.type === 'post' ? '📋' : noti.type === 'member' ? '👤' : '💬'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-wider">{noti.title}</p>
                                                    <p className="text-xs text-[#a0a0b0] truncate">{noti.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#FF8C69] rounded-full"></span> 참여 중인 채널
                            </h2>
                        </div>
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-44 bg-[#23232f] rounded-3xl animate-pulse border border-white/5"></div>
                                ))}
                            </div>
                        ) : myChannels.length === 0 ? (
                            <div className="bg-[#23232f] border border-dashed border-[#FF8C69]/20 rounded-3xl p-16 text-center shadow-inner">
                                <div className="text-5xl mb-6">🏝️</div>
                                <p className="text-[#6b6b8a] text-sm font-bold">
                                    {user?.role === 'admin' ? '운영 중인 채널이 없어요. 새로운 채널을 개설해 보세요!' : '가입된 채널이 없어요. 새로운 채널을 좌측 메뉴에서 찾아보세요!'}
                                </p>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="mt-8 px-10 py-4 orange-gradient text-white font-bold rounded-2xl shadow-xl shadow-[#FF8C69]/20 text-xs tracking-widest uppercase hover:scale-105 transition-transform"
                                    >
                                        새 채널 개설하기
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {myChannels.map((membership) => (
                                    <div
                                        key={membership.channelId?._id}
                                        onClick={() => handleChannelClick(membership.channelId)}
                                        className="group relative bg-[#23232f] p-8 rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden flex flex-col h-full shadow-xl"
                                        style={{
                                            borderColor: `${membership.channelId?.cardColor || '#FF8C69'}1A`,
                                            boxShadow: `0 20px 25px -5px ${membership.channelId?.cardColor || '#FF8C69'}10`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = `${membership.channelId?.cardColor || '#FF8C69'}4D`;
                                            e.currentTarget.style.boxShadow = `0 20px 25px -5px ${membership.channelId?.cardColor || '#FF8C69'}20`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = `${membership.channelId?.cardColor || '#FF8C69'}1A`;
                                            e.currentTarget.style.boxShadow = `0 20px 25px -5px ${membership.channelId?.cardColor || '#FF8C69'}10`;
                                        }}
                                    >
                                        <div
                                            className="absolute -top-10 -right-10 w-32 h-32 opacity-[0.05] rounded-full group-hover:scale-150 transition-transform duration-700"
                                            style={{ backgroundColor: membership.channelId?.cardColor || '#FF8C69' }}
                                        ></div>
                                        <div className="flex justify-between items-start mb-6">
                                            {membership.channelId?.profileImage ? (
                                                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                                                    <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0"
                                                    style={{
                                                        backgroundColor: `${membership.channelId?.cardColor || '#FF8C69'}1A`,
                                                        color: membership.channelId?.cardColor || '#FF8C69'
                                                    }}
                                                >🏘️</div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {/* 채널별 통합 알림 배지 추가 (사용자 요청) */}
                                                {(unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.notice > 0 ||
                                                    unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.post > 0 ||
                                                    unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.chat > 0 ||
                                                    unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.poll > 0) && (
                                                        <div
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-red-500/40 animate-bounce cursor-default"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                                            {(unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.notice || 0) +
                                                                (unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.post || 0) +
                                                                (unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.chat || 0) +
                                                                (unreadCounts[membership.channelId?._id?.toString() || membership.channelId?.toString()]?.poll || 0)}
                                                        </div>
                                                    )}
                                                <span
                                                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border`}
                                                    style={{
                                                        backgroundColor: membership.status === 'approved' ? '#06d6a01A' : '#eab3081A',
                                                        color: membership.status === 'approved' ? '#06d6a0' : '#eab308',
                                                        borderColor: membership.status === 'approved' ? '#06d6a033' : '#eab30833'
                                                    }}
                                                >
                                                    {membership.status === 'approved' ? '참여 중' : '대기 중'}
                                                </span>
                                            </div>
                                        </div>
                                        <h3
                                            className="text-2xl font-bold text-white mb-2 transition-colors truncate tracking-tight"
                                            onMouseEnter={(e) => e.currentTarget.style.color = membership.channelId?.cardColor || '#FF8C69'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                                        >{membership.channelId?.name}</h3>
                                        <p className="text-[#6b6b8a] text-xs line-clamp-2 mb-8 h-10 leading-relaxed font-medium">{membership.channelId?.description}</p>
                                        <div
                                            className="mt-auto pt-6 border-t flex items-center justify-between"
                                            style={{ borderColor: `${membership.channelId?.cardColor || '#FF8C69'}1A` }}
                                        >
                                            <div className="flex border-t-0 p-0 items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${membership.channelId?.ownerId?.isOnline ? 'bg-[#06d6a0]' : 'bg-gray-600'}`}></div>
                                                <span className="text-[9px] font-bold text-[#6b6b8a] uppercase tracking-widest font-mono">운영자 {membership.channelId?.ownerId?.isOnline ? '접속 중' : '미접속'}</span>
                                            </div>
                                            <div
                                                className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 font-bold text-xs uppercase tracking-tighter flex items-center gap-1"
                                                style={{ color: membership.channelId?.cardColor || '#FF8C69' }}
                                            >
                                                입장 <span className="text-[8px]">▶</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    {user?.role === 'admin' && (
                        <section className="mt-20 mb-32">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#FF8C69] rounded-full"></span> 채널 대화 스테이션
                                </h2>
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="text-[11px] font-bold text-[#FF8C69] hover:underline uppercase tracking-widest"
                                >
                                    전체 대화방 보기
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {myChannels.filter(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id).map(membership => {
                                    const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                    const themeColor = membership.channelId?.cardColor || '#FF8C69';
                                    const chatCount = unreadCounts[chId]?.chat || 0;

                                    return (
                                        <div
                                            key={`chat-card-${chId}`}
                                            onClick={() => {
                                                setCurrentChannel(membership.channelId);
                                                navigate(`/chat?channelId=${chId}`);
                                            }}
                                            className="relative bg-[#23232f] p-8 rounded-[2.5rem] border border-white/5 hover:border-[#FF8C69]/40 transition-all group cursor-pointer overflow-hidden shadow-2xl"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl group-hover:scale-125 transition-transform" style={{ color: themeColor }}>💬</div>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">🏘️</div>
                                                        <div>
                                                            <h3 className="text-xl font-bold text-white tracking-tight">{membership.channelId?.name}</h3>
                                                            <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest mt-1">대화방 즉시 입장</p>
                                                        </div>
                                                    </div>
                                                    {chatCount > 0 && (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full animate-bounce shadow-lg shadow-red-500/20">NEW MESSAGE</span>
                                                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">{chatCount}개의 읽지 않은 대화</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                                                    <span className="text-[10px] font-black text-[#444466] uppercase tracking-[0.2em]">Channel Communication Hub</span>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-[#FF8C69] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                                                        접속하기 <span>▶</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </>
            )}
            <ChannelCreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

const ActiveChatList = ({ channelId }) => {
    const navigate = useNavigate();
    const { rooms, fetchRooms, isLoading, setCurrentRoom } = useChatStore();

    useEffect(() => {
        if (channelId) {
            fetchRooms(channelId);
        }
    }, [channelId, fetchRooms]);

    if (isLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-[#23232f] rounded-3xl animate-pulse border border-white/5"></div>)}
        </div>
    );

    if (!rooms || rooms.length === 0) {
        return (
            <div className="bg-[#23232f]/50 border border-dashed border-white/5 rounded-3xl p-12 text-center">
                <p className="text-[#6b6b8a] text-[11px] font-bold uppercase tracking-[0.2em] font-mono">진행 중인 대화가 없습니다</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rooms.map((room) => (
                <div
                    key={room._id}
                    onClick={() => {
                        setCurrentRoom(room);
                        navigate(`/chat?channelId=${channelId}`);
                    }}
                    className="bg-[#23232f] p-6 rounded-[2rem] border border-white/5 hover:border-[#FF8C69]/40 transition-all group cursor-pointer flex items-center gap-5 relative overflow-hidden shadow-lg"
                >
                    <div className="w-14 h-14 bg-gradient-to-br from-[#FF8C69]/10 to-transparent rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👤</div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-white truncate mb-1">{room.memberId?.name || '익명'}</h4>
                        <p className="text-[10px] text-[#6b6b8a] truncate font-medium">{room.lastMessage || '새로운 대화를 확인하세요'}</p>
                    </div>
                    {room.lastMessageAt && (
                        <div className="absolute top-4 right-6 text-[8px] font-bold font-mono text-[#444466] uppercase">
                            {new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Dashboard;
