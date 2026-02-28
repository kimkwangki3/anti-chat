import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const SuperAdminChannelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [channel, setChannel] = useState(null);
    const [content, setContent] = useState({ members: [], notices: [], posts: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('members');

    useEffect(() => {
        fetchChannelData();
    }, [id]);

    const fetchChannelData = async () => {
        try {
            const [chRes, detailRes] = await Promise.all([
                axios.get(`/channels/${id}`),
                axios.get(`/superadmin/channels/${id}/detail`)
            ]);
            setChannel(chRes.data);
            setContent(detailRes.data);
        } catch (error) {
            console.error('Fetch channel detail failed:', error);
            alert('데이터를 불러오는데 실패했습니다.');
            navigate('/superadmin/channels');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
        try {
            await axios.delete(`/superadmin/posts/${postId}`);
            fetchChannelData();
        } catch (error) {
            alert('삭제 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteNotice = async (noticeId) => {
        if (!window.confirm('이 공지사항을 삭제하시겠습니까?')) return;
        try {
            await axios.delete(`/superadmin/notices/${noticeId}`);
            fetchChannelData();
        } catch (error) {
            alert('삭제 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleKickMember = async (userId) => {
        if (!window.confirm('이 회원을 채널에서 강제 추방하시겠습니까?')) return;
        try {
            await axios.delete(`/superadmin/channels/${id}/members/${userId}`);
            fetchChannelData();
        } catch (error) {
            alert('추방 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-[#FF8C69]">Loading Master Controls...</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-10">
                <button onClick={() => navigate('/superadmin/channels')} className="text-[#6b6b8a] text-xs font-bold mb-6 hover:text-white transition-colors flex items-center gap-2 uppercase tracking-widest font-mono">
                    ← 채널 관측소(목록)로 돌아가기
                </button>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-[#FF8C69]/10 flex items-center justify-center text-4xl border border-[#FF8C69]/20 shadow-2xl">
                        🏘️
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                            {channel.name} <span className="text-[#FF8C69]">커맨드</span> 💂‍♂️
                        </h1>
                        <p className="text-[#6b6b8a] text-xs mt-1 font-medium">{channel.description}</p>
                    </div>
                </div>
            </header>

            <nav className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                {[
                    { key: 'members', label: '가입 멤버' },
                    { key: 'notices', label: '채널 공지' },
                    { key: 'posts', label: '게시물 로그' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                            ? 'bg-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/20'
                            : 'text-[#6b6b8a] hover:text-white bg-white/5'
                            }`}
                    >
                        {tab.label} ({content[tab.key].length})
                    </button>
                ))}
            </nav>

            <div className="bg-[#12121a] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
                {activeTab === 'members' && (
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">사용자 식별정보</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">현재 상태</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">가입일시</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">관리 액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {content.members.map(m => (
                                    <tr key={m._id} className="hover:bg-white/[0.02] group transition-colors">
                                        <td className="px-8 py-4">
                                            <p className="text-sm font-bold text-white group-hover:text-[#FF8C69] transition-colors">{m.userId?.name}</p>
                                            <p className="text-[10px] font-bold text-[#444466] uppercase">{m.userId?.username}</p>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full ${m.userId?.status === 'active' || !m.userId?.status ? 'bg-[#06d6a0]/10 text-[#06d6a0]' : 'bg-red-500/10 text-red-500'}`}>
                                                {(!m.userId?.status || m.userId?.status === 'active') ? '정상' : '제한/탈퇴'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-[10px] font-bold text-[#6b6b8a] font-mono">
                                            {new Date(m.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-4">
                                            {m.userId?.role !== 'admin' && m.userId?.role !== 'superadmin' && (
                                                <button
                                                    onClick={() => handleKickMember(m.userId?._id)}
                                                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-black border border-red-500/20 transition-all uppercase"
                                                >
                                                    강제 추방
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'notices' && (
                    <div className="divide-y divide-white/5">
                        {content.notices.length > 0 ? content.notices.map(n => (
                            <div key={n._id} className="p-8 hover:bg-white/[0.02] flex justify-between items-start transition-colors">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">{n.title}</h3>
                                    <p className="text-sm text-[#8080a0] line-clamp-2 mb-4 leading-relaxed">{n.content}</p>
                                    <div className="flex gap-4 text-[10px] font-bold text-[#444466] font-mono uppercase">
                                        <span>✍️ {n.authorId?.name}</span>
                                        <span>📅 {new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteNotice(n._id)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black border border-red-500/20 transition-all uppercase">
                                    삭제
                                </button>
                            </div>
                        )) : (
                            <div className="p-20 text-center text-[10px] font-black text-[#333344] uppercase tracking-[0.3em]">등록된 공지사항이 없습니다.</div>
                        )}
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="divide-y divide-white/5">
                        {content.posts.length > 0 ? content.posts.map(p => (
                            <div key={p._id} className="p-8 hover:bg-white/[0.02] flex justify-between items-start transition-colors">
                                <div className="max-w-3xl">
                                    <p className="text-sm text-white/90 mb-4 whitespace-pre-wrap leading-relaxed">{p.content}</p>
                                    <div className="flex gap-4 text-[10px] font-bold text-[#444466] font-mono uppercase">
                                        <span>✍️ {p.authorId?.name}</span>
                                        <span>💬 {p.comments?.length || 0} 댓글</span>
                                        <span>📅 {new Date(p.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeletePost(p._id)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black border border-red-500/20 transition-all uppercase">
                                    피드 삭제
                                </button>
                            </div>
                        )) : (
                            <div className="p-20 text-center text-[10px] font-black text-[#333344] uppercase tracking-[0.3em]">기록된 게시물이 없습니다.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminChannelDetail;
