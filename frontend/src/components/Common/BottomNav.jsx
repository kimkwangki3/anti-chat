import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useChannelStore from '../../store/channelStore';
import useNotificationStore from '../../store/notificationStore';
import useDevice from '../../hooks/useDevice';
import UserAvatar from './UserAvatar';

// SF Symbol 스타일 SVG 아이콘 컴포넌트
const Icon = ({ name, active }) => {
    const color = active ? '#FF8C69' : '#475569';
    const icons = {
        home: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
                    fill={active ? color : 'none'} stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
        ),
        bell: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
                {active && <circle cx="18" cy="5" r="3" fill="#FF3B30" />}
            </svg>
        ),
        vote: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.7" />
                <path d="M8 12L11 15L16 9" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        board: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13H15M9 17H12M14 2V8H20" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        chat: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    fill={active ? `${color}22` : 'none'} stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
        ),
        gear: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.7" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41 2 2 0 0 1-1.41-.59l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="1.7" />
            </svg>
        ),
    };
    return icons[name] || null;
};

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentChannel, myChannels } = useChannelStore();
    const { user, logout } = useAuthStore();
    const { unreadCounts } = useNotificationStore();
    const { isIOS } = useDevice();

    const params = new URLSearchParams(location.search);
    const urlChannelId = params.get('channelId') || currentChannel?._id;

    const fallbackChannelId = myChannels.find(m =>
        (m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id)
    )?.channelId?._id;

    const activeChannelId = urlChannelId || fallbackChannelId;
    const counts = unreadCounts[urlChannelId] || { notice: 0, post: 0, chat: 0 };
    const totalUnreadAll = Object.values(unreadCounts || {}).reduce((acc, c) => acc + (c?.notice || 0) + (c?.post || 0) + (c?.chat || 0), 0);

    const navItems = [
        { icon: 'home', label: '홈', path: '/', badge: totalUnreadAll },
        { icon: 'bell', label: '공지', path: `/notices?channelId=${urlChannelId}`, badge: counts.notice, hidden: !urlChannelId },
        { icon: 'vote', label: '투표', path: `/polls?channelId=${urlChannelId}`, hidden: !urlChannelId },
        { icon: 'board', label: '게시물', path: `/board?channelId=${urlChannelId}`, badge: counts.post, hidden: !urlChannelId },
        { icon: 'chat', label: '채팅', path: `/chat?channelId=${urlChannelId}`, badge: counts.chat, hidden: !urlChannelId },
        { icon: 'gear', label: '설정', isSettings: true },
    ];

    const [showSettings, setShowSettings] = useState(false);

    const handleItemClick = (item) => {
        if (item.isSettings) {
            setShowSettings(true);
        } else {
            navigate(item.path);
        }
    };

    const isActive = (item) => {
        if (item.isSettings) return false;
        const currentPath = location.pathname + location.search;
        return currentPath === item.path;
    };

    return (
        <>
            {/* 모바일 하단 탭바 - iOS 스타일 */}
            <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${isIOS ? 'pb-6' : 'pb-1'}`}>
                {/* Frosted glass bar */}
                <div className="mx-3 mb-2 bg-[#09090b]/80 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl px-2 py-2">
                    <div className="flex items-center justify-around">
                        {navItems.filter(item => !item.hidden).map((item) => {
                            const active = isActive(item);
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => handleItemClick(item)}
                                    className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[52px] transition-all active:scale-90"
                                >
                                    {/* Active pill */}
                                    {active && (
                                        <span className="absolute inset-0 bg-white/10 rounded-2xl" />
                                    )}

                                    <span className="relative">
                                        <Icon name={item.icon} active={active} />
                                        {item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#FF3B30] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[#1c1c1e] shadow-lg">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                    </span>

                                    <span className={`text-[10px] font-semibold transition-colors leading-none ${active ? 'text-[#FF8C69]' : 'text-[#8e8e93]'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* 설정 Bottom Sheet */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center md:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    />
                    <div className="relative w-full bg-[#09090b]/95 backdrop-blur-3xl rounded-t-[2.5rem] border-t border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-6 pb-10 pt-4">
                            {/* 유저 프로필 */}
                            <div className="flex items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <UserAvatar
                                    profileImage={user?.profileImage}
                                    name={user?.name}
                                    size="w-14 h-14"
                                    radiusClass="rounded-2xl"
                                />
                                <div>
                                    <h3 className="text-base font-semibold text-white">{user?.name}</h3>
                                    <p className="text-xs text-[#8e8e93]">{user?.role === 'admin' ? '운영자' : user?.role === 'superadmin' ? '최고운영자' : '멤버'}</p>
                                </div>
                            </div>

                            {/* 채널 관리 도구 */}
                            {(user?.role === 'admin' || user?.role === 'superadmin') && activeChannelId && (
                                <div className="mb-6">
                                    <p className="text-xs text-[#8e8e93] font-medium px-1 mb-3 uppercase tracking-wider">채널 관리</p>
                                    <div className="bg-[#2c2c2e]/80 rounded-2xl overflow-hidden border border-white/5">
                                        <button
                                            onClick={() => { navigate(`/admin/members?channelId=${activeChannelId}`); setShowSettings(false); }}
                                            className="w-full flex items-center gap-3 px-5 py-4 text-white text-sm font-medium hover:bg-white/5 transition-colors border-b border-white/5"
                                        >
                                            <span className="w-8 h-8 rounded-xl bg-[#FF8C69]/20 flex items-center justify-center text-sm">👥</span>
                                            멤버 관리
                                        </button>
                                        <button
                                            onClick={() => { navigate(`/admin/edit-channel?channelId=${activeChannelId}`); setShowSettings(false); }}
                                            className="w-full flex items-center gap-3 px-5 py-4 text-white text-sm font-medium hover:bg-white/5 transition-colors"
                                        >
                                            <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm">⚙️</span>
                                            채널 설정
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 최고 관리자 도구 */}
                            {user?.role === 'superadmin' && (
                                <div className="mb-6">
                                    <p className="text-xs text-[#FF8C69] font-medium px-1 mb-3 uppercase tracking-wider">👑 최고 관리자</p>
                                    <div className="bg-[#2c2c2e]/80 rounded-2xl overflow-hidden border border-[#FF8C69]/10">
                                        {[
                                            { label: '전체 회원 관리', icon: '👑', path: '/superadmin/users' },
                                            { label: '전체 채널 관리', icon: '🌐', path: '/superadmin/channels' },
                                            { label: '채팅 로그 열람', icon: '🔍', path: '/superadmin/chats' },
                                        ].map((item, i, arr) => (
                                            <button
                                                key={item.label}
                                                onClick={() => { navigate(item.path); setShowSettings(false); }}
                                                className={`w-full flex items-center gap-3 px-5 py-4 text-[#FF8C69] text-sm font-medium hover:bg-[#FF8C69]/5 transition-colors ${i < arr.length - 1 ? 'border-b border-[#FF8C69]/10' : ''}`}
                                            >
                                                <span className="w-8 h-8 rounded-xl bg-[#FF8C69]/15 flex items-center justify-center text-sm">{item.icon}</span>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 일반 메뉴 */}
                            <div className="space-y-3">
                                <div className="bg-[#2c2c2e]/80 rounded-2xl overflow-hidden border border-white/5">
                                    <button
                                        onClick={() => { navigate('/settings'); setShowSettings(false); }}
                                        className="w-full flex items-center gap-3 px-5 py-4 text-white text-sm font-medium hover:bg-white/5 transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm">⚙️</span>
                                        시스템 설정 및 알림
                                    </button>
                                </div>
                                <div className="bg-[#2c2c2e]/80 rounded-2xl overflow-hidden border border-white/5">
                                    <button
                                        onClick={() => { logout(); setShowSettings(false); }}
                                        className="w-full flex items-center gap-3 px-5 py-4 text-[#FF453A] text-sm font-medium hover:bg-[#FF453A]/5 transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-xl bg-[#FF453A]/15 flex items-center justify-center text-sm">👋</span>
                                        로그아웃
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full py-4 bg-[#2c2c2e]/80 text-[#8e8e93] text-sm font-semibold rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomNav;
