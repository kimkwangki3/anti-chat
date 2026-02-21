import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useChannelStore from '../../store/channelStore';
import useNotificationStore from '../../store/notificationStore';

// SF Symbol 스타일 아이콘 컴포넌트
const SideIcon = ({ name, active }) => {
    const c = active ? '#FF8C69' : '#636366';
    const icons = {
        home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z" fill={active ? `${c}30` : 'none'} stroke={c} strokeWidth="1.7" strokeLinejoin="round" /></svg>,
        bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>,
        vote: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.7" /><path d="M8 12L11 15L16 9" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        board: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 13H15M9 17H12M14 2V8H20" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" fill={active ? `${c}25` : 'none'} stroke={c} strokeWidth="1.7" strokeLinejoin="round" /></svg>,
        gear: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.7" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41 2 2 0 0 1-1.41-.59l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth="1.7" /></svg>,
        users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.7" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        globe: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.7" /><path d="M2 12h20M12 2C12 2 8 7 8 12s4 10 4 10M12 2c0 0 4 5 4 10s-4 10-4 10" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>,
        log: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke={c} strokeWidth="1.7" /><path d="m21 21-4.35-4.35" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>,
        crown: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 19h20M3 9l4 5 5-9 5 9 4-5-2 10H5L3 9z" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    };
    return <span className="flex-shrink-0">{icons[name]}</span>;
};

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { unreadCounts, pendingCounts } = useNotificationStore();

    const params = new URLSearchParams(location.search);
    const urlChannelId = params.get('channelId') || currentChannel?._id;

    const counts = unreadCounts[urlChannelId] || { notice: 0, post: 0, chat: 0 };
    const pendingBadge = pendingCounts[urlChannelId] || 0;
    const totalUnreadAll = Object.values(unreadCounts).reduce((acc, c) => acc + (c.notice || 0) + (c.post || 0) + (c.chat || 0), 0);

    const menuItems = [
        { id: 'dashboard', label: '홈', icon: 'home', path: '/', count: urlChannelId ? 0 : totalUnreadAll },
        { id: 'notice', label: '공지사항', icon: 'bell', path: `/notices?channelId=${urlChannelId}`, count: counts.notice, hidden: !urlChannelId },
        { id: 'poll', label: '투표', icon: 'vote', path: `/polls?channelId=${urlChannelId}`, hidden: !urlChannelId },
        { id: 'board', label: '게시판', icon: 'board', path: `/board?channelId=${urlChannelId}`, count: counts.post, hidden: !urlChannelId },
        { id: 'chat', label: '채팅', icon: 'chat', path: `/chat?channelId=${urlChannelId}`, count: counts.chat, hidden: !urlChannelId },
        { id: 'settings', label: '설정', icon: 'gear', path: '/settings' },
    ];

    const adminMenuItems = [
        { id: 'members', label: '멤버 관리', icon: 'users', path: `/admin/members?channelId=${urlChannelId}` },
        { id: 'edit', label: '채널 설정', icon: 'edit', path: `/admin/edit-channel?channelId=${urlChannelId}` },
    ];

    const superAdminMenuItems = [
        { id: 'sa-users', label: '전체 회원', icon: 'crown', path: '/superadmin/users' },
        { id: 'sa-channels', label: '전체 채널', icon: 'globe', path: '/superadmin/channels' },
        { id: 'sa-chats', label: '채팅 로그', icon: 'log', path: '/superadmin/chats' },
        { id: 'sa-polls', label: '전체 투표', icon: 'vote', path: '/superadmin/polls' },
    ];

    const isActive = (path) => location.pathname + location.search === path;

    const NavItem = ({ item, badge = 0 }) => {
        const active = isActive(item.path);
        return (
            <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${active
                        ? 'bg-white/8 text-white'
                        : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-[#FF8C69]/20' : 'bg-transparent group-hover:bg-white/5'
                        }`}>
                        <SideIcon name={item.icon} active={active} />
                    </span>
                    <span className={`text-[13px] font-medium tracking-tight ${active ? 'text-white' : ''}`}>
                        {item.label}
                    </span>
                </div>
                {badge > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${active ? 'bg-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/30' : 'bg-[#FF3B30] text-white'
                        }`}>
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
                {active && (
                    <span className="absolute left-0 w-0.5 h-5 bg-[#FF8C69] rounded-r-full" />
                )}
            </button>
        );
    };

    const SectionLabel = ({ label, accent }) => (
        <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 mt-6 ${accent ? 'text-[#FF8C69]/70' : 'text-[#3a3a3c]'}`}>
            {label}
        </p>
    );

    return (
        <div className="w-60 h-full bg-[#111113] border-r border-white/[0.06] flex flex-col z-30">
            {/* 로고 */}
            <div className="px-5 pt-7 pb-5">
                <div
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg shadow-lg shadow-white/5 border border-[#FF8C69]/20 group-hover:scale-105 transition-transform">
                        <span>🍑</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-widest font-mono uppercase leading-none">PEACH</h1>
                        <span className="text-[9px] font-semibold text-[#FF8C69]/70 uppercase tracking-widest">Connect</span>
                    </div>
                </div>
            </div>

            {/* 구분선 */}
            <div className="h-px bg-white/[0.05] mx-4" />

            {/* 메뉴 */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar relative">
                <SectionLabel label="채널 메뉴" />
                <div className="space-y-0.5">
                    {menuItems.filter(item => !item.hidden).map((item) => (
                        <NavItem key={item.id} item={item} badge={item.count} />
                    ))}
                </div>

                {(user?.role === 'admin' || user?.role === 'superadmin') && urlChannelId && (
                    <>
                        <SectionLabel label="채널 관리" />
                        <div className="space-y-0.5">
                            {adminMenuItems.map((item) => (
                                <NavItem key={item.id} item={item} badge={item.id === 'members' ? pendingBadge : 0} />
                            ))}
                        </div>
                    </>
                )}

                {user?.role === 'superadmin' && (
                    <>
                        <SectionLabel label="👑 최고 관리자" accent />
                        <div className="space-y-0.5">
                            {superAdminMenuItems.map((item) => (
                                <NavItem key={item.id} item={item} />
                            ))}
                        </div>
                    </>
                )}
            </nav>

            {/* 구분선 */}
            <div className="h-px bg-white/[0.05] mx-4" />

            {/* 유저 프로필 */}
            <div className="p-4">
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF8C69] to-[#E8735A] flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-[#FF8C69]/20 flex-shrink-0">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate leading-tight">{user?.name}</p>
                        <p className="text-[10px] text-[#636366] leading-tight">
                            {user?.role === 'admin' ? '운영자' : user?.role === 'superadmin' ? '최고운영자' : '멤버'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium text-[#636366] hover:text-[#FF453A] hover:bg-[#FF453A]/5 transition-all"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    로그아웃
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
