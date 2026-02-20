import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useChatStore from '../store/chatStore';
import useNotificationStore from '../store/notificationStore';
import ChannelCreateModal from '../components/Common/ChannelCreateModal';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { myChannels, fetchMyChannels, isLoading, setCurrentChannel } = useChannelStore();
    const { notifications, pendingCounts, unreadCounts } = useNotificationStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 모든 채널의 총 미승인 수 (관리자)
    const totalPending = Object.values(pendingCounts).reduce((s, n) => s + n, 0);

    // 모든 채널의 총 읽지 않은 소식 수 (일반회원)
    const totalUnread = Object.values(unreadCounts).reduce((acc, counts) => {
        return acc + (counts.notice || 0) + (counts.post || 0) + (counts.chat || 0);
    }, 0);

    useEffect(() => {
        if (user?._id) {
            fetchMyChannels();
        }
        setCurrentChannel(null);
    }, [user?._id, fetchMyChannels, setCurrentChannel]);

    const handleChannelClick = (channel) => {
        setCurrentChannel(channel);
        navigate(`/notices?channelId=${channel._id}`);
    };

    return (
        <div className="h-full bg-[#1a1a24] text-[#e8e8f0] p-6 md:p-10 overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-end mb-12">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-1 px-2 bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-bold rounded-md border border-[#FF9500]/20 font-mono">ONLINE</span>
                        <h2 className="text-xs font-bold text-[#6b6b8a] uppercase tracking-widest font-mono italic">Enterprise Connect</h2>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        반가워요, <span className="text-[#FF9500]">{user?.name}님</span> 🍑
                    </h1>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-4 bg-[#FF9500] text-white font-bold rounded-2xl hover:bg-[#FFB347] transition-all shadow-lg shadow-[#FF9500]/20 flex items-center gap-2 active:scale-95"
                        disabled={myChannels.some(m => m.channelId?.ownerId?._id === user?._id)}
                    >
                        <span className="text-xl">+</span>
                    </button>
                )}
            </header>

            {/* 새 소식 및 활동 요약 섹션 */}
            {(notifications.length > 0 || (user?.role === 'admin' && totalPending > 0) || (user?.role === 'member' && totalUnread > 0)) && (
                <section className="mb-10">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2 mb-5">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> 새로운 소식
                    </h2>
                    <div className="space-y-3">
                        {/* 관리자: 미승인 가입 신청 요약 */}
                        {user?.role === 'admin' && totalPending > 0 && (
                            <div
                                onClick={() => navigate(`/admin/members?channelId=${myChannels[0]?.channelId?._id}`)}
                                className="flex items-center gap-4 p-5 bg-[#23232f] border border-red-500/20 rounded-3xl cursor-pointer hover:border-red-500/40 transition-all group shadow-xl"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl">👥</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">미승인 가입 신청</p>
                                    <p className="text-[11px] text-[#6b6b8a] mt-0.5">총 {totalPending}건의 가입 신청이 승인 대기 중입니다</p>
                                </div>
                                <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full">{totalPending}</span>
                            </div>
                        )}

                        {/* 일반회원: 채널별 미읽음 소식 요약 */}
                        {user?.role === 'member' && myChannels.map(membership => {
                            const chId = membership.channelId?._id;
                            const counts = unreadCounts[chId] || { notice: 0, post: 0, chat: 0 };
                            const sum = counts.notice + counts.post + counts.chat;
                            if (sum === 0) return null;

                            // 이동 시 채팅이 있으면 채팅으로, 아니면 게시판, 아니면 공지로 이동
                            const handleSmartNavigate = () => {
                                setCurrentChannel(membership.channelId);
                                if (counts.chat > 0) {
                                    navigate(`/chat?channelId=${chId}`);
                                } else if (counts.post > 0) {
                                    navigate(`/board?channelId=${chId}`);
                                } else {
                                    navigate(`/notices?channelId=${chId}`);
                                }
                            };

                            return (
                                <div
                                    key={`summary-${chId}`}
                                    onClick={handleSmartNavigate}
                                    className="flex items-center gap-4 p-5 bg-[#23232f] border border-[#FF9500]/10 rounded-3xl cursor-pointer hover:border-[#FF9500]/30 transition-all group shadow-xl"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center text-2xl shadow-inner">🏘️</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{membership.channelId?.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {counts.notice > 0 && <span className="text-[10px] text-purple-400 font-bold flex items-center gap-1">📢 {counts.notice}</span>}
                                            {counts.post > 0 && <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">📋 {counts.post}</span>}
                                            {counts.chat > 0 && <span className="text-[10px] text-[#FF9500] font-bold flex items-center gap-1 animate-pulse">💬 {counts.chat}</span>}
                                        </div>
                                    </div>
                                    <span className="text-[#FF9500] text-xs font-black px-3 py-1.5 bg-[#FF9500]/10 rounded-full">+{sum}</span>
                                </div>
                            );
                        })}

                        {/* 최근 알림 목록 (최대 3개) */}
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
                </section>
            )}

            <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#FF9500] rounded-full"></span> 내 채널
                    </h2>
                    {user?.role === 'member' && (
                        <button
                            onClick={() => navigate('/search-channels')}
                            className="text-[11px] font-bold text-[#FF9500] hover:text-[#FFB347] transition-colors uppercase tracking-widest"
                        >
                            + 탐색하기
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-44 bg-[#23232f] rounded-3xl animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : myChannels.length === 0 ? (
                    <div className="bg-[#23232f] border border-dashed border-[#FF9500]/20 rounded-3xl p-16 text-center shadow-inner">
                        <div className="text-5xl mb-6">🏜️</div>
                        <p className="text-[#6b6b8a] text-sm mb-8 font-bold">
                            {user?.role === 'admin' ? '운영 중인 채널이 없어요. 새로운 채널을 개설해 보세요!' : '가입된 채널이 없어요. 새로운 채널을 찾아보세요!'}
                        </p>
                        <button
                            onClick={() => user?.role === 'admin' ? setIsModalOpen(true) : navigate('/search-channels')}
                            className="px-10 py-4 orange-gradient text-white font-bold rounded-2xl shadow-xl shadow-[#FF9500]/20 text-xs tracking-widest uppercase hover:scale-105 transition-transform"
                        >
                            {user?.role === 'admin' ? '새 채널 개설하기' : '채널 탐색하기'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {myChannels.map((membership) => {
                            const chId = membership.channelId?._id;
                            const chCounts = unreadCounts[chId] || { notice: 0, post: 0, chat: 0 };
                            const totalUnread = chCounts.notice + chCounts.post + chCounts.chat;

                            return (
                                <div
                                    key={membership.channelId?._id}
                                    onClick={() => handleChannelClick(membership.channelId)}
                                    className="group relative bg-[#23232f] p-8 rounded-[2.5rem] border border-white/5 hover:border-[#FF9500]/30 transition-all cursor-pointer overflow-hidden flex flex-col h-full shadow-xl hover:shadow-[#FF9500]/5"
                                >
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FF9500] opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-[#FF9500]/10 text-[#FF9500] rounded-2xl flex items-center justify-center text-xl shadow-inner">
                                            🏘️
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* 채널별 신규 알림 뱃지 */}
                                            {chCounts.notice > 0 && (
                                                <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    📢 {chCounts.notice}
                                                </span>
                                            )}
                                            {chCounts.post > 0 && (
                                                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    📋 {chCounts.post}
                                                </span>
                                            )}
                                            {chCounts.chat > 0 && (
                                                <span className="flex items-center gap-1 bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                                                    💬 {chCounts.chat}
                                                </span>
                                            )}
                                            {totalUnread === 0 && (
                                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm ${membership.status === 'approved' ? 'bg-[#06d6a0]/10 text-[#06d6a0] border border-[#06d6a0]/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                                                    {membership.status === 'approved' ? 'Active' : 'Pending'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FF9500] transition-colors truncate tracking-tight">{membership.channelId?.name}</h3>
                                    <p className="text-[#6b6b8a] text-xs line-clamp-2 mb-8 h-10 leading-relaxed font-medium">{membership.channelId?.description}</p>

                                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${membership.channelId?.ownerId?.isOnline ? 'bg-[#06d6a0] shadow-[0_0_8px_#06d6a0]' : 'bg-gray-600'}`}></div>
                                            <span className="text-[9px] font-bold text-[#6b6b8a] uppercase tracking-widest font-mono">Host {membership.channelId?.ownerId?.isOnline ? 'Live' : 'Off'}</span>
                                        </div>
                                        <div className="text-[#FF9500] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 font-bold text-xs uppercase tracking-tighter flex items-center gap-1">
                                            Enter <span className="text-[8px]">▶</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {user?.role === 'admin' && (
                <section className="mt-20 mb-32">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-[#8080a0] flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#FF9500] rounded-full"></span> 실시간 채널 현황
                        </h2>
                        <button
                            onClick={() => navigate('/chat')}
                            className="text-[11px] font-bold text-[#FF9500] hover:underline uppercase tracking-widest"
                        >
                            전체 보기
                        </button>
                    </div>

                    <ActiveChatList channelId={myChannels.find(m => m.channelId?.ownerId?._id === user?._id)?.channelId?._id} />
                </section>
            )}

            <ChannelCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
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

    const handleRoomClick = (room) => {
        setCurrentRoom(room);
        navigate(`/chat?channelId=${channelId}`);
    };

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
                    onClick={() => handleRoomClick(room)}
                    className="bg-[#23232f] p-6 rounded-[2rem] border border-white/5 hover:border-[#FF9500]/40 transition-all group cursor-pointer flex items-center gap-5 relative overflow-hidden shadow-lg"
                >
                    <div className="w-14 h-14 bg-gradient-to-br from-[#FF9500]/10 to-transparent rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        👤
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-white truncate mb-1">
                            {room.memberId?.name || '익명'}
                        </h4>
                        <p className="text-[10px] text-[#6b6b8a] truncate font-medium">
                            {room.lastMessage || '새로운 대화를 확인하세요'}
                        </p>
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
