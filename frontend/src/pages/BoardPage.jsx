import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import usePostStore from '../store/postStore';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';

const BoardPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { posts, fetchPostsByChannel, createPost, deletePost, isLoading, error } = usePostStore();
    const { user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { resetUnreadCount } = useNotificationStore();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '' });

    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    useEffect(() => {
        if (channelId) {
            fetchPostsByChannel(channelId);
            resetUnreadCount(channelId, 'post');
        }
    }, [fetchPostsByChannel, channelId, resetUnreadCount]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await createPost({ ...formData, channelId });
        if (success) {
            setFormData({ title: '', content: '' });
            setShowForm(false);
        }
    };

    const handleDelete = async (e, postId) => {
        e.stopPropagation();
        if (window.confirm('정말 이 게시글을 삭제하시겠습니까?')) {
            await deletePost(postId);
        }
    };

    if (!channelId) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a0f] text-[#6b6b8a] flex-col gap-4">
                <div className="w-20 h-20 bg-[#12121a] rounded-3xl border border-white/5 flex items-center justify-center text-3xl opacity-50">📋</div>
                <h2 className="text-xl font-bold text-white font-mono tracking-widest text-center uppercase">채널을 선택하세요</h2>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin' && (currentChannel?.ownerId?._id === user?._id || currentChannel?.ownerId === user?._id);

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a24] text-red-500/50 flex-col gap-4">
                <div className="w-20 h-20 bg-[#23232f] rounded-[2.5rem] flex items-center justify-center text-3xl shadow-inner border border-red-500/10">🚨</div>
                <p className="font-bold uppercase tracking-widest text-[10px] font-mono">{error}</p>
                <button onClick={() => fetchPostsByChannel(channelId)} className="text-[10px] font-black text-[#FF8C69] uppercase tracking-widest hover:underline mt-2">다시 시도</button>
            </div>
        );
    }

    const themeColor = currentChannel?.cardColor || '#4f6ef7';

    return (
        <div className="flex flex-col h-full bg-[#1a1a24] text-[#e8e8f0]">
            <header className="p-6 md:p-10 flex justify-between items-end border-b border-white/5 bg-[#1a1a24]/80 backdrop-blur-md sticky top-0 z-20">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="p-1 px-2 text-[10px] font-bold rounded-md border font-mono italic"
                            style={{ backgroundColor: `${themeColor}1A`, color: themeColor, borderColor: `${themeColor}33` }}
                        >
                            BOARDS
                        </span>
                        <h2 className="text-xs font-bold text-[#6b6b8a] uppercase tracking-widest font-mono italic">
                            데이터베이스 스트림
                        </h2>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {currentChannel?.name || '채널'} <span style={{ color: themeColor }}>게시판</span>
                    </h1>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-6 py-3 rounded-2xl font-bold text-[12px] transition-all flex items-center gap-2 shadow-xl active:scale-95"
                        style={{
                            backgroundColor: showForm ? 'rgba(239, 68, 68, 0.1)' : themeColor,
                            color: showForm ? '#ef4444' : 'white',
                            border: showForm ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                            boxShadow: showForm ? 'none' : `0 10px 15px -3px ${themeColor}40`
                        }}
                    >
                        {showForm ? '취소' : '+ 새 글 작성'}
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
                <div className="max-w-6xl mx-auto">
                    {showForm && (
                        <div
                            className="mb-12 bg-[#12121a] border rounded-3xl p-8 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl"
                            style={{ borderColor: `${themeColor}26` }}
                        >
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.2em] mb-2 font-mono ml-1">제목</label>
                                    <input
                                        type="text"
                                        placeholder="게시글 제목을 입력하세요"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-[#1a1a28] border border-white/5 rounded-xl px-5 py-4 text-white text-sm focus:outline-none transition-all shadow-inner"
                                        style={{ focusBorderColor: themeColor }}
                                        required
                                        onFocus={(e) => e.target.style.borderColor = themeColor}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.2em] mb-2 font-mono ml-1">내용</label>
                                    <textarea
                                        placeholder="채널 멤버들과 공유할 내용을 작성하세요"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows="6"
                                        className="w-full bg-[#1a1a28] border border-white/5 rounded-xl px-5 py-5 text-white text-sm focus:outline-none transition-all min-h-[180px] shadow-inner"
                                        required
                                        onFocus={(e) => e.target.style.borderColor = themeColor}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 text-white font-bold rounded-2xl transition-all shadow-xl uppercase text-xs tracking-widest active:scale-[0.98]"
                                    style={{
                                        backgroundColor: themeColor,
                                        boxShadow: `0 10px 20px -5px ${themeColor}40`
                                    }}
                                >
                                    {isLoading ? '전송 중...' : '작성 완료'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {isLoading && !showForm ? (
                            [1, 2, 3].map(i => <div key={i} className="h-64 bg-[#12121a] rounded-3xl animate-pulse border border-white/5 shadow-xl"></div>)
                        ) : posts.length === 0 ? (
                            <div className="col-span-full py-40 text-center">
                                <span className="text-5xl block mb-6 opacity-20">📋</span>
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-[#333344]">등록된 게시글이 없습니다</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <article
                                    key={post._id}
                                    onClick={() => navigate(`/board/${post._id}`)}
                                    className="group bg-[#12121a] p-8 border rounded-[2.5rem] transition-all cursor-pointer flex flex-col h-full shadow-xl relative overflow-hidden"
                                    style={{
                                        borderColor: `${themeColor}1A`,
                                        boxShadow: `0 20px 25px -5px rgba(0,0,0,0.1)`
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = `${themeColor}4D`;
                                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = `${themeColor}1A`;
                                        e.currentTarget.style.backgroundColor = '#12121a';
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="text-[10px] font-mono text-[#444466] uppercase tracking-[0.2em] font-bold">
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </span>
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => handleDelete(e, post._id)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                title="게시글 삭제"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                    <h2
                                        className="text-2xl font-bold mb-4 text-[#e8e8f0] transition-colors line-clamp-2 leading-tight tracking-tight"
                                        onMouseEnter={(e) => e.target.style.color = themeColor}
                                        onMouseLeave={(e) => e.target.style.color = '#e8e8f0'}
                                    >
                                        {post.title}
                                    </h2>
                                    <p className="text-[#6b6b8a] line-clamp-3 text-sm mb-10 leading-relaxed flex-1 font-medium">{post.content}</p>
                                    <div
                                        className="mt-auto pt-6 border-t font-bold text-[10px] uppercase tracking-widest flex justify-between items-center"
                                        style={{ borderColor: `${themeColor}1A` }}
                                    >
                                        <span className="text-[#444466]">내용 더보기</span>
                                        <span style={{ color: themeColor }}>▶</span>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardPage;
