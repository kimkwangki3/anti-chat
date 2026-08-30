import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostContent from '../components/PostContent';
import usePostStore from '../store/postStore';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import useChannelStore from '../store/channelStore';
import { getFileUrl, normalizeDisplayFileName } from '../utils/fileUtils';
import axios from '../api/axios';

const PostDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPost, fetchPostById, markAsRead, addComment, isLoading, error } = usePostStore();
    const { user } = useAuthStore();
    const { resetUnreadCount } = useNotificationStore();
    const { currentChannel } = useChannelStore();
    const [comment, setComment] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [imgUploading, setImgUploading] = useState(false);
    const editRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.isMaster;

    const insertImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImgUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const { data } = await axios.post('/posts/upload-image', fd);
            const md = `\n![](${data.imageUrl})\n`;
            const ta = editRef.current;
            const pos = ta ? ta.selectionStart : editContent.length;
            setEditContent(editContent.slice(0, pos) + md + editContent.slice(pos));
        } catch (err) {
            alert('이미지 업로드 실패: ' + (err.response?.data?.message || err.message));
        } finally {
            setImgUploading(false);
            e.target.value = '';
        }
    };

    const startEdit = () => {
        setEditTitle(currentPost.title || '');
        setEditContent(currentPost.content || '');
        setIsEditing(true);
    };
    const saveEdit = async () => {
        if (!editTitle.trim()) { alert('제목을 입력하세요.'); return; }
        setSaving(true);
        try {
            await axios.put(`/posts/${id}`, { title: editTitle, content: editContent });
            await fetchPostById(id);
            setIsEditing(false);
        } catch (err) {
            alert('수정에 실패했습니다: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const themeColor = currentPost?.channelId?.cardColor || currentChannel?.cardColor || '#FF8C69';
    const detailChannelName = currentPost?.channelId?.name || currentChannel?.name || '채널';

    useEffect(() => {
        fetchPostById(id).then(post => {
            if (post) {
                markAsRead(id);
                resetUnreadCount(post.channelId?._id || post.channelId, 'post');
            }
        });
    }, [id, fetchPostById, markAsRead, resetUnreadCount]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        await addComment(id, comment);
        setComment('');
    };

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center font-bold text-[#FF8C69] animate-pulse uppercase tracking-[0.5em]">Loading...</div>;

    if (!currentPost) return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-[#6b6b8a]">
            <p className="mb-4 font-bold">게시글을 찾을 수 없습니다.</p>
            <button onClick={() => navigate('/')} className="text-[#FF8C69] hover:underline uppercase text-xs font-bold tracking-widest">대시보드로 돌아가기</button>
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
                    className="mb-12 group flex items-center gap-3 text-[10px] font-bold text-[#444466] transition-all uppercase tracking-[0.2em]"
                    style={{ '--tw-text-opacity': '1' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#444466'}
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> COMMUNITY
                </button>

                <article className="bg-[#12121a] border border-white/5 rounded-3xl p-10 shadow-2xl mb-16 relative overflow-hidden" style={{ borderTopColor: `${themeColor}40` }}>
                    {isAdmin && !isEditing && (
                        <button
                            onClick={startEdit}
                            className="absolute top-6 right-6 z-20 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                            style={{ backgroundColor: themeColor, boxShadow: `0 8px 16px ${themeColor}40` }}
                        >
                            ✏️ 수정
                        </button>
                    )}
                    <header className="mb-10 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg uppercase"
                                style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
                            >
                                {detailChannelName?.[0]}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#e8e8f0]">{detailChannelName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }}></span>
                                    <p className="text-[10px] font-bold text-[#444466] uppercase tracking-widest leading-none pt-0.5">{new Date(currentPost.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        {isEditing ? (
                            <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="제목"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold text-white focus:outline-none"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold leading-tight text-[#e8e8f0] tracking-tight">{currentPost.title}</h1>
                        )}
                    </header>

                    {isEditing ? (
                        <div className="relative z-10">
                            <textarea
                                ref={editRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={10}
                                placeholder="내용 (글 중간에 이미지를 넣을 수 있습니다)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white leading-relaxed focus:outline-none resize-y"
                            />
                            <div className="flex flex-wrap gap-2 mt-3 items-center">
                                <button onClick={saveEdit} disabled={saving || imgUploading} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: themeColor }}>
                                    {saving ? '저장 중...' : '저장'}
                                </button>
                                <button onClick={() => setIsEditing(false)} disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#9aa0b8] bg-white/5 border border-white/10">
                                    취소
                                </button>
                                <label className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#9bb4ff] bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
                                    {imgUploading ? '업로드 중...' : '🖼️ 이미지 삽입'}
                                    <input type="file" accept="image/*" className="hidden" onChange={insertImage} disabled={imgUploading} />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="border-l-2 pl-8 ml-1 relative z-10" style={{ borderColor: `${themeColor}40` }}>
                            <PostContent content={currentPost.content} className="text-[#8890a8] leading-relaxed text-sm font-medium" />
                        </div>
                    )}

                    {Array.isArray(currentPost.attachments) && currentPost.attachments.length > 0 && (
                        <div className="mt-8 space-y-2 pl-8">
                            <p className="text-xs font-bold text-[#9aa0b8] uppercase tracking-widest">첨부 파일</p>
                            {currentPost.attachments.map((file, index) => (
                                <a
                                    key={`${file.fileUrl}-${index}`}
                                    href={getFileUrl(file.fileUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-sm text-[#9bb4ff] hover:underline truncate"
                                >
                                    📎 {normalizeDisplayFileName(file.fileName)}
                                </a>
                            ))}
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
};

export default PostDetailPage;
