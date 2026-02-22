import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useNoticeStore from '../store/noticeStore';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import { useSocket } from '../socket/SocketContext';
import useNotificationStore from '../store/notificationStore';
import { getFileUrl } from '../utils/fileUtils';

const NoticePage = () => {
    const { notices, fetchNotices, createNotice, deleteNotice, uploadImage, markAsRead, isLoading } = useNoticeStore();
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

    const isAdmin = user?.role === 'admin' && currentChannel?.ownerId?._id === user?._id;

    useEffect(() => {
        if (channelId) {
            fetchNotices(channelId);
            resetUnreadCount(channelId, 'notice');
        }
    }, [fetchNotices, channelId, resetUnreadCount]);

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
            formData.append('image', selectedImage);
            imageUrl = await uploadImage(formData);
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

    return (
        <div className="flex flex-col h-full bg-[#1a1a24] text-[#e8e8f0]">
            {/* Header */}
            <header className="unified-header">
                <div>
                    <h1 className="text-xl font-bold italic text-white flex items-center gap-2">
                        {currentChannel?.name || '채널'} <span className="text-[#FF8C69] text-xs font-mono tracking-tighter not-italic">공지 스트림</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full animate-pulse shadow-[0_0_8px_rgba(6,214,160,0.5)]"></span>
                        <span className="text-[9px] font-bold text-[#06d6a0] font-mono uppercase tracking-[0.2em]">
                            {onlineCount}명 대화 중
                        </span>
                    </div>
                </div>
            </header>

            {/* Notice List (Chat Style) */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(255,149,0,0.03),transparent)]"
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
                                <div className="w-7 h-7 rounded-lg bg-[#FF8C69] flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-[#FF8C69]/20 leading-none">
                                    운영
                                </div>
                                <span className="text-[11px] font-bold text-[#e8e8f0] uppercase tracking-widest">공식 공지</span>
                                <span className="text-[9px] font-mono text-[#444466] uppercase tracking-tighter">{new Date(notice.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="max-w-[85%] sm:max-w-[75%] bg-[#23232f] border border-white/5 p-6 rounded-3xl rounded-tl-none relative group shadow-xl">
                                {notice.imageUrl && (
                                    <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group-hover:border-[#FF8C69]/30 transition-all">
                                        <img
                                            src={getFileUrl(notice.imageUrl)}
                                            alt="공지 이미지"
                                            className="w-full h-auto max-h-[500px] object-contain hover:scale-105 transition-transform duration-700 pointer-events-auto cursor-zoom-in"
                                            onClick={() => window.open(getFileUrl(notice.imageUrl), '_blank')}
                                        />
                                    </div>
                                )}
                                <p className="text-[13px] leading-relaxed text-[#d1d1e0] whitespace-pre-wrap selection:bg-[#FF8C69]/30">{notice.content}</p>

                                {isAdmin && (
                                    <button
                                        onClick={() => { if (window.confirm('공지를 삭제하시겠습니까?')) deleteNotice(notice._id); }}
                                        className="absolute -top-1 -right-1 sm:-right-12 sm:top-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 text-red-500/50 hover:text-red-500 text-[10px] font-bold uppercase"
                                    >
                                        [ 삭제 ]
                                    </button>
                                )}

                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full"></span>
                                        <span className="text-[9px] font-mono text-[#FF8C69] tracking-widest uppercase italic">{notice.readBy?.length || 0}명 읽음</span>
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
                            <div className="relative group p-2 bg-[#23232f] border border-[#FF8C69]/30 rounded-2xl shadow-2xl">
                                <img src={imagePreview} className="w-40 h-40 object-cover rounded-xl" alt="미리보기" />
                                <button
                                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                    className="absolute -top-3 -right-3 w-8 h-8 bg-[#FF8C69] text-white rounded-full flex items-center justify-center text-lg font-bold shadow-[0_0_15px_rgba(255,149,0,0.5)] hover:bg-red-500 hover:shadow-red-500/50 transition-all"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto flex gap-4 items-end">
                        <div className="relative flex-1 group">
                            <div className="absolute -inset-0.5 orange-gradient rounded-3xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
                            <div className="relative flex flex-col bg-[#23232f] border border-white/5 rounded-3xl overflow-hidden focus-within:border-[#FF8C69]/50 transition-all shadow-inner">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="채널 공식 공지사항을 입력하세요..."
                                    className="w-full bg-transparent px-8 py-5 text-[13px] text-white focus:outline-none min-h-[60px] max-h-60 custom-scrollbar resize-none leading-relaxed"
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
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#6b6b8a] hover:text-[#FF8C69] hover:bg-[#FF8C69]/10 cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest font-mono"
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
                            className="h-[60px] w-[60px] orange-gradient text-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#FF8C69]/20 hover:scale-110 active:scale-90 transition-all disabled:opacity-20 disabled:grayscale"
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
                <div className="p-5 bg-[#1a1a24] border-t border-white/5 flex items-center justify-center gap-3">
                    <span className="text-sm">🔐</span>
                    <p className="text-[10px] font-mono text-[#444466] uppercase tracking-[0.4em] font-medium italic">Broadcast Only Account.</p>
                </div>
            )}
        </div>
    );
};

export default NoticePage;
