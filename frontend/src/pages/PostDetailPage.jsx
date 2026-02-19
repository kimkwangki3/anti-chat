import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usePostStore from '../store/postStore';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

const PostDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPost, fetchPostById, markAsRead, addComment, isLoading, error } = usePostStore();
    const { user } = useAuthStore();
    const { resetUnreadCount } = useNotificationStore();
    const [comment, setComment] = useState('');

    useEffect(() => {
        fetchPostById(id).then(post => {
            if (post) {
                markAsRead(id);
                resetUnreadCount(post.channelId, 'post');
            }
        });
    }, [id, fetchPostById, markAsRead, resetUnreadCount]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        await addComment(id, comment);
        setComment('');
    };

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center font-mono text-[#4f6ef7] animate-pulse uppercase tracking-[0.5em]">Loading...</div>;

    if (!currentPost) return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-[#6b6b8a]">
            <p className="mb-4">게시글을 찾을 수 없습니다.</p>
            <button onClick={() => navigate('/board')} className="text-[#4f6ef7] hover:underline uppercase text-xs font-bold tracking-widest">목록으로 돌아가기</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/board')}
                    className="mb-12 group flex items-center gap-3 text-[10px] font-bold font-mono text-[#444466] hover:text-[#4f6ef7] transition-all uppercase tracking-[0.2em]"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> COMMUNITY
                </button>

                <article className="bg-[#12121a] border border-white/5 rounded-3xl p-10 shadow-2xl mb-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <span className="text-8xl font-['Bebas_Neue'] uppercase leading-none">POST</span>
                    </div>

                    <header className="mb-10 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#4f6ef7]/20 uppercase">
                                {currentPost.authorId?.name?.[0]}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#e8e8f0]">{currentPost.authorId?.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 bg-[#4f6ef7] rounded-full"></span>
                                    <p className="text-[10px] font-mono text-[#444466] uppercase tracking-widest leading-none pt-0.5">{new Date(currentPost.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold leading-tight text-[#e8e8f0] tracking-tight">{currentPost.title}</h1>
                    </header>

                    <div className="text-[#6b6b8a] whitespace-pre-wrap leading-relaxed text-sm mb-12 border-l-2 border-[#4f6ef7]/20 pl-8 ml-1 relative z-10">
                        {currentPost.content}
                    </div>
                </article>

                <section className="relative z-10 mb-20">
                    <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
                        <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-[#4f6ef7]">COMMENTS</h2>
                        <span className="bg-[#4f6ef7]/10 text-[#4f6ef7] px-2 py-0.5 rounded text-[10px] font-bold font-mono">{currentPost.comments?.length || 0}</span>
                    </div>

                    <div className="space-y-6 mb-12">
                        {currentPost.comments?.length === 0 ? (
                            <p className="text-center py-12 text-[#444466] text-xs font-mono uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">첫 번째 댓글을 남겨보세요</p>
                        ) : (
                            currentPost.comments?.map((c) => (
                                <div key={c._id} className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-[#4f6ef7]/20 text-[#4f6ef7] flex items-center justify-center text-[8px] font-bold uppercase">
                                                {c.authorId?.name?.[0]}
                                            </div>
                                            <span className="text-[11px] font-bold text-[#e8e8f0]">{c.authorId?.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-[#444466] uppercase">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-[#6b6b8a] leading-relaxed pl-8">{c.content}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={handleCommentSubmit} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                        <div className="relative">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="생각을 공유하세요..."
                                className="w-full bg-[#12121a] border border-white/10 rounded-2xl px-6 py-6 pr-32 text-xs text-white focus:outline-none focus:border-[#4f6ef7]/50 transition-all resize-none h-24"
                            ></textarea>
                            <button
                                type="submit"
                                disabled={!comment.trim()}
                                className="absolute right-4 bottom-4 px-8 py-3 bg-[#4f6ef7] text-white text-[10px] font-bold rounded-xl hover:bg-[#7bb3ff] transition-all shadow-lg shadow-[#4f6ef7]/20 uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
                            >
                                게시하기
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default PostDetailPage;
