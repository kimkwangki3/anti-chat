import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import usePostStore from '../store/postStore';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';

const BoardPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { posts, fetchPostsByChannel, createPost, isLoading, error } = usePostStore();
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

    if (!channelId) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a0f] text-[#6b6b8a] flex-col gap-4">
                <div className="w-20 h-20 bg-[#12121a] rounded-3xl border border-white/5 flex items-center justify-center text-3xl opacity-50">📋</div>
                <h2 className="text-xl font-bold text-white font-mono tracking-widest text-center uppercase">채널을 선택하세요</h2>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin' && currentChannel?.ownerId?._id === user?._id;
    const channelRole = currentChannel?.members.find(member => member.userId._id === user?._id)?.role;


    return (
        <div className="flex flex-col h-full bg-[#1a1a24]">
            <header className="unified-header">
                <div>
                    <h1 className="text-xl font-bold italic text-white flex items-center gap-2">
                        {currentChannel?.name || '채널'} <span className="text-[#4f6ef7] text-xs font-mono tracking-tighter not-italic">게시판</span>
                    </h1>
                    <p className="text-[#6b6b8a] text-[9px] font-mono tracking-[0.3em] uppercase ml-1 mt-0.5">채널 회원 전용 소통 공간</p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-6 py-2 rounded-xl font-bold text-[11px] transition-all border ${showForm ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#4f6ef7] border-[#4f6ef7] text-white shadow-lg shadow-[#4f6ef7]/20 hover:scale-105'}`}
                    >
                        {showForm ? '취소' : '+ 새 글 작성'}
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
                <div className="max-w-6xl mx-auto">
                    {showForm && (
                        <div className="mb-12 bg-[#12121a] border border-[rgba(79,110,247,0.15)] rounded-2xl p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-widest mb-2 font-mono ml-1">제목</label>
                                    <input
                                        type="text"
                                        placeholder="글 제목을 입력하세요"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-[#1a1a28] border border-white/5 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-widest mb-2 font-mono ml-1">내용</label>
                                    <textarea
                                        placeholder="채널 회원들에게 알릴 내용을 적어주세요"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows="6"
                                        className="w-full bg-[#1a1a28] border border-white/5 rounded-lg px-4 py-4 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all min-h-[150px]"
                                        required
                                    ></textarea>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#4f6ef7] text-white font-bold rounded-xl hover:bg-[#7bb3ff] transition-all shadow-lg shadow-[#4f6ef7]/20 uppercase text-xs tracking-widest">
                                    {isLoading ? '게시 중...' : '작성 완료'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading && !showForm ? (
                            [1, 2, 3].map(i => <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse border border-white/5"></div>)
                        ) : posts.length === 0 ? (
                            <div className="col-span-full py-20 text-center opacity-30 font-mono tracking-widest text-xs uppercase">게시글이 없습니다</div>
                        ) : (
                            posts.map((post) => (
                                <article
                                    key={post._id}
                                    onClick={() => navigate(`/board/${post._id}`)}
                                    className="bg-[#12121a] p-8 border border-white/5 rounded-2xl transition-all hover:border-[#4f6ef7]/30 hover:bg-white/[0.02] group cursor-pointer flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="text-[9px] font-mono text-[#444466] uppercase tracking-[0.2em]">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h2 className="text-xl font-bold mb-3 text-[#e8e8f0] group-hover:text-[#4f6ef7] transition-colors line-clamp-2 leading-tight">{post.title}</h2>
                                    <p className="text-[#6b6b8a] line-clamp-3 text-xs mb-8 leading-relaxed flex-1">{post.content}</p>
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
