import { useNavigate, useLocation } from 'react-router-dom';
import useChannelStore from '../../store/channelStore';
import useNotificationStore from '../../store/notificationStore';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentChannel } = useChannelStore();
    const { unreadCounts } = useNotificationStore();

    const counts = unreadCounts[currentChannel?._id] || { notice: 0, post: 0, chat: 0 };

    const navItems = [
        { icon: '🏠', label: '홈', path: '/' },
        { icon: '📢', label: '공지', path: `/notices?channelId=${currentChannel?._id}`, count: counts.notice, hidden: !currentChannel },
        { icon: '📋', label: '게시판', path: `/board?channelId=${currentChannel?._id}`, count: counts.post, hidden: !currentChannel },
        { icon: '💬', label: '채팅', path: `/chat?channelId=${currentChannel?._id}`, count: counts.chat, hidden: !currentChannel },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#12121a]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around h-16 px-2 z-50 md:hidden pb-safe">
            {navItems.filter(item => !item.hidden).map((item) => {
                const isActive = location.pathname + location.search === item.path;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-all ${isActive ? 'text-[#FF9500]' : 'text-[#6b6b8a]'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>

                        {item.count > 0 && (
                            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]">
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
    );
};

export default BottomNav;
