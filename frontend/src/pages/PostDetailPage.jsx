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
            <button onClick={() => navigate('/')} className="text-[#4f6ef7] hover:underline uppercase text-xs font-bold tracking-widest">대시보드로 돌아가기</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => {
                        const channelId = currentPost.channelId?._id || currentPost.channelId;
                        navigate(`/board?channelId=${channelId}`);
                    }}
                    className="mb-12 group flex items-center gap-3 text-[10px] font-bold font-mono text-[#444466] hover:text-[#4f6ef7] transition-all uppercase tracking-[0.2em]"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> COMMUNITY
                </button>

                <article className="bg-[#12121a] border border-white/5 rounded-3xl p-10 shadow-2xl mb-16 relative overflow-hidden">
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

                    <div className="text-[#6b6b8a] whitespace-pre-wrap leading-relaxed text-sm border-l-2 border-[#4f6ef7]/20 pl-8 ml-1 relative z-10">
                        {currentPost.content}
                    </div>
                </article>
            </div>
        </div>
    );
};

export default PostDetailPage;
