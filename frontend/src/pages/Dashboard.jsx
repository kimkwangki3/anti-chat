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
        navigate(channel?.slug ? `/channel/${channel.slug}` : `/notices?channelId=${channel._id}`);
    };

    const renderSuperAdminStats = () => {
        if (isStatsLoading) return <div className="p-10 text-center text-[#FF8C69] font-medium">지표 데이터를 불러오는 중...</div>;
        if (!stats) return <div className="p-10 text-center text-gray-500">표시할 통계 데이터가 없습니다.</div>;

        return (
            <>
                <div className="glass-card p-6">
                    <p className="text-sm font-medium text-gray-400 mb-3">오늘 신규 가입</p>
                    <p className="text-4xl font-bold text-white">{stats.today.newUsers}<span className="text-base font-medium text-[#FF8C69] ml-1.5">명</span></p>
                    <p className="text-sm text-gray-500 mt-2">전체 {stats.total.totalUsers}명</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-sm font-medium text-gray-400 mb-3">오늘 신규 채널</p>
                    <p className="text-4xl font-bold text-white">{stats.today.newChannels}<span className="text-base font-medium text-[#FF8C69] ml-1.5">개</span></p>
                    <p className="text-sm text-gray-500 mt-2">전체 {stats.total.totalChannels}개</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-sm font-medium text-gray-400 mb-3">오늘 신규 게시글</p>
                    <p className="text-4xl font-bold text-white">{stats.today.newPosts}<span className="text-base font-medium text-purple-400 ml-1.5">개</span></p>
                    <p className="text-sm text-gray-500 mt-2">전체 {stats.total.totalPosts}개</p>
                </div>
            </>
        );
    };

    return (
        <div className="page-container p-5 md:p-8 pb-24 md:pb-8 pt-safe">
            <header className="flex justify-between items-center mb-8 animate-slide-up">
                <div>
                    <p className="text-sm text-gray-500 mb-1">
                        {user?.role === 'superadmin' ? '최고관리자' : '온라인'}
                    </p>
                    <h2 className="text-2xl font-bold text-white">
                        반가워요, <span className="text-[#FF8C69]">{user?.role === 'superadmin' ? '최고관리자' : (user?.name || user?.username)}</span>님 👋
                    </h2>
                </div>
                {user?.role === 'superadmin' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsModalOpen(true)} className="peach-button px-5 py-2.5 text-sm">
                            + 채널 생성
                        </button>
                        <button onClick={() => navigate('/superadmin/channels')} className="glass-card px-5 py-2.5 text-sm font-bold text-[#FF8C69] border-[#FF8C69]/20 hover:bg-[#FF8C69]/5 transition-colors rounded-xl">
                            채널 관리
                        </button>
                    </div>
                )}
            </header>

            {user?.role === 'superadmin' ? (
                <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-5">
                        <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full"></span> 실시간 현황
                    </p>
                    <div className="bento-grid !p-0 !gap-4">
                        {renderSuperAdminStats()}
                    </div>
                </section>
            ) : (
                <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {superAdminRoom && (
                        <section>
                            <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-4">
                                <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full animate-pulse"></span> 관리자 메시지
                            </p>
                            <div
                                onClick={() => navigate(`/chat?roomId=${superAdminRoom._id}`)}
                                className="glass-card p-6 cursor-pointer border border-[#FF8C69]/20 hover:border-[#FF8C69]/40 transition-colors"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-[#FF8C69] mb-1">1:1 메시지</p>
                                        <h3 className="text-lg font-bold text-white">최고관리자로부터 메시지가 도착했습니다</h3>
                                        <p className="mt-1 text-sm text-gray-500">확인하려면 탭하세요.</p>
                                    </div>
                                    <span className="text-xl text-gray-400">→</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {((Array.isArray(notifications) && notifications.length > 0) || totalPending > 0 || totalUnread > 0) && (
                        <section>
                            <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-4">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span> 새 알림
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {user?.role === 'admin' && totalPending > 0 && (
                                    <div
                                        onClick={() => {
                                            const adminChannel = myChannels.find(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id);
                                            navigate(`/admin/members?channelId=${adminChannel?.channelId?._id || myChannels[0]?.channelId?._id}`);
                                        }}
                                        className="glass-card p-5 cursor-pointer hover:border-[#FF8C69]/30 transition-colors"
                                    >
                                        <p className="text-xs font-semibold text-[#FF8C69] mb-2">가입 승인 대기</p>
                                        <h3 className="text-lg font-bold text-white mb-1">{totalPending}건 대기 중</h3>
                                        <p className="text-sm text-gray-500">새로운 멤버가 승인을 기다리고 있습니다.</p>
                                    </div>
                                )}
                                {Array.isArray(myChannels) && myChannels.map(membership => {
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
                                            className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-white/15 transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                                                {membership.channelId?.profileImage ? (
                                                    <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg">🏘️</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{membership.channelId?.name}</p>
                                                <p className="text-xs text-[#FF8C69] font-medium mt-0.5">새 콘텐츠 {sum}개</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section>
                        <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full"></span> 내 채널
                        </p>
                        {isLoading ? (
                            <div className="bento-grid !p-0">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-44 glass-card animate-pulse"></div>
                                ))}
                            </div>
                        ) : myChannels.length === 0 ? (
                            <div className="glass-card p-16 text-center border-dashed">
                                <div className="text-4xl mb-4">🏝️</div>
                                <p className="text-gray-500 text-sm">
                                    {user?.role === 'admin' ? '배정된 채널이 없습니다. 최고관리자가 채널을 배정하면 여기에 표시됩니다.' : '가입된 채널이 없습니다.'}
                                </p>
                            </div>
                        ) : (
                            <div className="bento-grid !p-0">
                                {Array.isArray(myChannels) && myChannels.map((membership) => {
                                    const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                    const cc = unreadCounts[chId] || {};
                                    const unread = (cc.notice || 0) + (cc.post || 0) + (cc.chat || 0) + (cc.poll || 0);
                                    return (
                                    <div
                                        key={membership.channelId?._id}
                                        onClick={() => handleChannelClick(membership.channelId)}
                                        className={`glass-card p-6 flex flex-col h-full cursor-pointer transition-colors ${unread > 0 ? 'border-[#FF3B30]/40 hover:border-[#FF3B30]/60' : 'hover:border-white/15'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5">
                                                {membership.channelId?.profileImage ? (
                                                    <img src={membership.channelId.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl">🏘️</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {unread > 0 && (
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FF3B30] text-white shadow-lg shadow-red-500/30 animate-pulse">
                                                        새 메시지 {unread > 99 ? '99+' : unread}
                                                    </span>
                                                )}
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                                    membership.status === 'approved'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                }`}>
                                                    {membership.status === 'approved' ? '활성' : '대기중'}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-1.5 truncate">{membership.channelId?.name}</h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-3">{membership.channelId?.description}</p>
                                        {membership.channelId?.slug && (
                                            <p className="text-xs text-[#FF8C69]/70 mb-4">/channel/{membership.channelId.slug}</p>
                                        )}
                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${membership.channelId?.ownerId?.isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`}></div>
                                                <span className="text-xs text-gray-500">관리자 {membership.channelId?.ownerId?.isOnline ? '온라인' : '오프라인'}</span>
                                            </div>
                                            <span className="text-xs font-medium text-[#FF8C69]">입장 →</span>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {user?.role === 'admin' && (
                        <section className="mb-24">
                            <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-4">
                                <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full"></span> 채팅 관리
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Array.isArray(myChannels) && myChannels.filter(m => m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id).map(membership => {
                                    const chId = membership.channelId?._id?.toString() || membership.channelId?.toString();
                                    const chatCount = unreadCounts[chId]?.chat || 0;
                                    return (
                                        <div
                                            key={`chat-card-${chId}`}
                                            onClick={() => {
                                                setCurrentChannel(membership.channelId);
                                                navigate(`/chat?channelId=${chId}`);
                                            }}
                                            className="glass-card p-6 cursor-pointer hover:border-white/15 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">🏘️</div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-white">{membership.channelId?.name}</h3>
                                                        <p className="text-xs text-gray-500 mt-0.5">채팅 관리</p>
                                                    </div>
                                                </div>
                                                {chatCount > 0 && (
                                                    <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                                        {chatCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <span className="text-xs text-gray-600">멤버와 1:1 대화</span>
                                                <span className="text-xs font-medium text-[#FF8C69]">열기 →</span>
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
