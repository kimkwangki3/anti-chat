import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useChannelStore from '../../store/channelStore';
import useNotificationStore from '../../store/notificationStore';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentChannel } = useChannelStore();
    const { unreadCounts } = useNotificationStore();

    // [고도화] URL에서 채널 ID 추출 (새로고침 시 메뉴 유지를 위함)
    const params = new URLSearchParams(location.search);
    const urlChannelId = params.get('channelId') || currentChannel?._id;

    const counts = unreadCounts[urlChannelId] || { notice: 0, post: 0, chat: 0 };
    const totalUnreadAll = Object.values(unreadCounts).reduce((acc, c) => acc + (c.notice || 0) + (c.post || 0) + (c.chat || 0), 0);

    const navItems = [
        { icon: '🏠', label: '홈', path: '/', globalCount: totalUnreadAll },
        { icon: '📢', label: '공지', path: `/notices?channelId=${urlChannelId}`, count: counts.notice, hidden: !urlChannelId },
        { icon: '📋', label: '게시물', path: `/board?channelId=${urlChannelId}`, count: counts.post, hidden: !urlChannelId },
        { icon: '💬', label: '채팅', path: `/chat?channelId=${urlChannelId}`, count: counts.chat, hidden: !urlChannelId },
        { icon: '⚙️', label: '설정', path: '/settings', isSettings: true },
    ];

    const [showSettings, setShowSettings] = useState(false);
    const { user, logout } = useAuthStore();

    const handleItemClick = (item) => {
        navigate(item.path);
    };

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-[#12121a]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around h-16 px-2 z-50 md:hidden pb-safe">
                {navItems.filter(item => !item.hidden).map((item) => {
                    const isActive = location.pathname + location.search === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleItemClick(item)}
                            className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-all ${isActive ? 'text-[#FF9500]' : 'text-[#6b6b8a]'
                                }`}
                        >
                            <span className="relative text-xl">
                                {item.icon}
                                {item.globalCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#12121a] shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                                )}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>

                            {item.count > 0 && (
                                <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse">
                                    {item.count > 99 ? '99+' : item.count}
                                </span>
                            )}

                            {isActive && (
                                <span className="absolute -bottom-1 w-1 h-1 bg-[#FF9500] rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* 모바일 설정 팝업 */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center md:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    ></div>
                    <div className="relative w-full bg-[#1a1a24] rounded-t-[2rem] p-8 border-t border-white/10 animate-in slide-in-from-bottom duration-300">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl orange-gradient flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-[#FF9500]/20">
                                {user?.name?.[0]}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{user?.name}</h3>
                                <p className="text-xs text-[#6b6b8a] uppercase tracking-widest font-mono">{user?.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => { logout(); setShowSettings(false); }}
                                className="w-full py-5 bg-[#FF5E00]/10 text-[#FF5E00] rounded-2xl text-sm font-bold flex items-center justify-center gap-3 border border-[#FF5E00]/20 active:scale-95 transition-all"
                            >
                                👋 안전하게 로그아웃하기
                            </button>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full py-5 bg-white/5 text-[#6b6b8a] rounded-2xl text-sm font-bold active:scale-95 transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomNav;
