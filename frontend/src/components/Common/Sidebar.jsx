import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useChannelStore from '../../store/channelStore';
import useNotificationStore from '../../store/notificationStore';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { unreadCounts } = useNotificationStore();

    const counts = unreadCounts[currentChannel?._id] || { notice: 0, post: 0, chat: 0 };

    const menuItems = [
        { id: 'dashboard', label: '홈', icon: '🏠', path: '/' },
        { id: 'notice', label: '공지사항', icon: '📢', path: `/notices?channelId=${currentChannel?._id}`, count: counts.notice, hidden: !currentChannel },
        { id: 'board', label: '게시판', icon: '📋', path: `/board?channelId=${currentChannel?._id}`, count: counts.post, hidden: !currentChannel },
        { id: 'chat', label: '채팅', icon: '💬', path: `/chat?channelId=${currentChannel?._id}`, count: counts.chat, hidden: !currentChannel },
    ];

    const adminMenuItems = [
        { id: 'members', label: '멤버 관리', icon: '👥', path: `/admin/members?channelId=${currentChannel?._id}` },
        { id: 'edit', label: '채널 설정', icon: '⚙️', path: `/admin/edit-channel?channelId=${currentChannel?._id}` },
    ];

    return (
        <div className="w-64 h-full bg-[#12121a] border-r border-white/5 flex flex-col z-30">
            {/* Logo Section */}
            <div className="p-8">
                <div
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 orange-gradient rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-[#FF9500]/20 group-hover:scale-110 transition-transform">
                        🍑
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-widest font-mono uppercase italic leading-none">ANTI</h1>
                        <span className="text-[10px] font-bold text-[#FF9500] uppercase tracking-widest">Connect</span>
                    </div>
                </div>
            </div>

            {/* Main Menu */}
            <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                <div className="px-4 mb-4">
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.2em] mb-4">Channel Menu</p>
                    <div className="space-y-2">
                        {menuItems.filter(item => !item.hidden).map((item) => {
                            const isActive = location.pathname + location.search === item.path;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${isActive
                                        ? 'bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20'
                                        : 'text-[#6b6b8a] hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg transition-transform group-hover:scale-125 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                        <span className="text-sm font-bold">{item.label}</span>
                                    </div>
                                    {item.count > 0 && (
                                        <span className="bg-[#FF9500] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-[#FF9500]/20 animate-bounce">
                                            {item.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {(user?.role === 'admin' || user?.role === 'superadmin') && currentChannel && (
                    <div className="px-4 mt-8">
                        <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.2em] mb-4">Admin Suite</p>
                        <div className="space-y-2">
                            {adminMenuItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(item.path)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive
                                            ? 'bg-white/5 text-white border border-white/10'
                                            : 'text-[#6b6b8a] hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-sm font-bold">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </nav>

            {/* User Profile & Logout */}
            <div className="p-4 bg-black/20 mt-auto border-t border-white/5">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-3 border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#FF5E00] flex items-center justify-center text-white font-bold shadow-lg shadow-[#FF9500]/20">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                        <p className="text-[10px] text-[#6b6b8a] uppercase font-mono">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold text-[#6b6b8a] hover:text-[#FF5E00] hover:bg-[#FF5E00]/5 transition-all uppercase tracking-widest border border-transparent hover:border-[#FF5E00]/20"
                >
                    👋 Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
