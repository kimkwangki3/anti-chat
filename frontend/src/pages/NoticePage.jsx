import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useNoticeStore from '../store/noticeStore';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import { useSocket } from '../socket/SocketContext';
import useNotificationStore from '../store/notificationStore';
import { getFileUrl } from '../utils/fileUtils';

const NoticePage = () => {
    const { notices, fetchNotices, createNotice, deleteNotice, uploadImage, markAsRead, markAllAsRead, isLoading } = useNoticeStore();
    const { user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { onlineCount } = useSocket();
    const { resetUnreadCount } = useNotificationStore();
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const scrollRef = useRef(null);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const isAdmin = user?.role === 'superadmin' ||
        (user?.role === 'admin' && (currentChannel?.ownerId?._id === user?._id || currentChannel?.ownerId === user?._id));

    useEffect(() => {
        if (channelId) {
            // 새로고침 시 currentChannel이 없거나 URL과 다를 경우 동기화
            if (!currentChannel || currentChannel._id !== channelId) {
                const channelInfo = useChannelStore.getState().myChannels.find(m => m.channelId?._id === channelId)?.channelId;
                if (channelInfo) {
                    useChannelStore.getState().setCurrentChannel(channelInfo);
                }
            }
            fetchNotices(channelId);
            resetUnreadCount(channelId, 'notice');
            markAllAsRead(channelId);
        }
    }, [fetchNotices, channelId, resetUnreadCount, currentChannel, markAllAsRead]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [notices]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !selectedImage) return;

        setIsUploading(true);
        let imageUrl = null;

        if (selectedImage) {
            const formData = new FormData();
            formData.append('file', selectedImage);
            imageUrl = await uploadImage(formData);

            if (!imageUrl) {
                alert('이미지 업로드에 실패했습니다. (서버/Cloudinary 설정 확인 필요)');
                setIsUploading(false);
                return;
            }
        }

        const success = await createNotice(channelId, '공지', content, imageUrl);
        if (success) {
            setContent('');
            setSelectedImage(null);
            setImagePreview(null);
        }
        setIsUploading(false);
    };

    const handleRead = (noticeId, readBy) => {
        if (!readBy.includes(user?._id)) {
            markAsRead(noticeId);
        }
    };

    if (!channelId) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a24] text-[#6b6b8a] flex-col gap-4">
                <div className="w-20 h-20 bg-[#23232f] rounded-3xl border border-white/5 flex items-center justify-center text-3xl opacity-50 shadow-inner">📢</div>
                <h2 className="text-xl font-bold text-white font-mono tracking-widest text-center uppercase">채널을 선택하세요</h2>
            </div>
        );
    }

    const themeColor = currentChannel?.cardColor || '#FF8C69';

    return (
        <div className="flex flex-col h-full bg-[#1a1a24] text-[#e8e8f0]">
            {/* Header */}
            <header className="p-6 md:p-10 flex justify-between items-end border-b border-white/5 bg-[#1a1a24]/80 backdrop-blur-md sticky top-0 z-20">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="p-1 px-2 text-[10px] font-bold rounded-md border font-mono italic"
                            style={{ backgroundColor: `${themeColor}1A`, color: themeColor, borderColor: `${themeColor}33` }}
                        >
                            BROADCAST
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full animate-pulse shadow-[0_0_8px_rgba(6,214,160,0.5)]"></span>
                            <span className="text-[9px] font-bold text-[#06d6a0] font-mono uppercase tracking-[0.2em]">
                                {onlineCount}명 대화 중
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {currentChannel?.name || '채널'} <span style={{ color: themeColor }}>공지사항</span>
                    </h1>
                </div>
            </header>

            {/* Notice List (Chat Style) */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar"
                style={{ backgroundImage: `radial-gradient(circle at top right, ${themeColor}08, transparent)` }}
            >
                {notices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                        <div className="text-6xl mb-4">📢</div>
                        <p className="font-mono text-xs tracking-[0.3em] uppercase">등록된 공지가 없습니다</p>
                    </div>
                ) : (
                    [...notices].reverse().map((notice, idx) => (
                        <div
                            key={notice._id}
                            className={`flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500`}
                            onMouseEnter={() => handleRead(notice._id, notice.readBy || [])}
                        >
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-lg leading-none"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 4px 10px ${themeColor}40` }}
                                >
                                    운영
                                </div>
                                <span className="text-[11px] font-bold text-[#e8e8f0] uppercase tracking-widest">공식 공지</span>
                                <span className="text-[9px] font-mono text-[#444466] uppercase tracking-tighter">{new Date(notice.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="max-w-[85%] sm:max-w-[75%] bg-[#22222e] border border-white/5 p-6 rounded-3xl rounded-tl-none relative group shadow-2xl">
                                {notice.imageUrl && (
                                    <div
                                        className="mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group-hover:border-[#FF8C69]/30 transition-all"
                                        style={{ borderHoverColor: themeColor }}
                                    >
                                        <img
                                            src={getFileUrl(notice.imageUrl)}
                                            alt="공지 이미지"
                                            className="w-full h-auto max-h-[500px] object-contain hover:scale-105 transition-transform duration-700 pointer-events-auto cursor-zoom-in"
                                            onClick={() => window.open(getFileUrl(notice.imageUrl), '_blank')}
                                        />
                                    </div>
                                )}
                                <p className="text-[13px] leading-relaxed text-[#d1d1e0] whitespace-pre-wrap">{notice.content}</p>

                                {isAdmin && (
                                    <button
                                        onClick={() => { if (window.confirm('공지를 삭제하시겠습니까?')) deleteNotice(notice._id); }}
                                        className="absolute -top-1 -right-1 sm:-right-12 sm:top-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 text-red-500/50 hover:text-red-500 text-[10px] font-bold uppercase"
                                    >
                                        🗑️
                                    </button>
                                )}

                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }}></span>
                                        <span className="text-[9px] font-mono tracking-widest uppercase italic" style={{ color: themeColor }}>{notice.readBy?.length || 0}명 읽음</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Input (Admin Only) */}
            {isAdmin && (
                <div className="p-6 bg-[#1a1a24] border-t border-white/5 relative z-30">
                    {imagePreview && (
                        <div className="absolute bottom-full left-6 mb-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="relative group p-2 bg-[#23232f] border rounded-2xl shadow-2xl" style={{ borderColor: `${themeColor}4D` }}>
                                <img src={imagePreview} className="w-40 h-40 object-cover rounded-xl" alt="미리보기" />
                                <button
                                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                    className="absolute -top-3 -right-3 w-8 h-8 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-xl hover:bg-red-500 transition-all"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}80` }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto flex gap-4 items-end">
                        <div className="relative flex-1 group">
                            <div className="absolute -inset-0.5 rounded-3xl blur opacity-5 group-focus-within:opacity-20 transition duration-500" style={{ backgroundColor: themeColor }}></div>
                            <div className="relative flex flex-col bg-[#23232f] border border-white/5 rounded-3xl overflow-hidden transition-all shadow-inner" onFocus={(e) => e.currentTarget.style.borderColor = themeColor} onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="채널 공식 공지사항을 입력하세요..."
                                    className="w-full bg-transparent px-8 py-5 text-[14px] text-white focus:outline-none min-h-[60px] max-h-60 custom-scrollbar resize-none leading-relaxed"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                                <div className="px-6 py-2 flex items-center justify-between border-t border-white/5 bg-white/[0.01]">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            id="notice-image"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                        <label
                                            htmlFor="notice-image"
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#6b6b8a] hover:bg-white/5 cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest font-mono"
                                            onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#6b6b8a'}
                                        >
                                            <span className="text-sm">📸</span> PHOTO
                                        </label>
                                    </div>
                                    <span className="text-[8px] font-mono text-[#3a3a4a] uppercase italic pointer-events-none">Official Broadcast Stream</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isUploading || (!content.trim() && !selectedImage)}
                            className="h-[64px] w-[64px] text-white rounded-3xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px ${themeColor}40` }}
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : <span className="text-xl">🚀</span>}
                        </button>
                    </form>
                </div>
            )}

            {/* Member View Footer */}
            {!isAdmin && (
                <div className="p-6 bg-[#1a1a24] border-t border-white/5 flex items-center justify-center gap-3">
                    <span className="text-sm">🔐</span>
                    <p className="text-[10px] font-mono text-[#444466] uppercase tracking-[0.4em] font-medium italic">Broadcast Only Account.</p>
                </div>
            )}
        </div>
    );
};

export default NoticePage;
