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
                <button onClick={() => navigate('/superadmin/channels')} className="text-[#6b6b8a] text-xs font-bold mb-6 hover:text-white transition-colors flex items-center gap-2">
                    ← BACK TO OBSERVATORY
                </button>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-[#4f6ef7]/10 flex items-center justify-center text-4xl border border-[#4f6ef7]/20 shadow-2xl">
                        🏘️
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tight">
                            {channel.name} <span className="text-[#4f6ef7]">COMMAND</span> 💂‍♂️
                        </h1>
                        <p className="text-[#6b6b8a] text-xs mt-1 font-medium italic">{channel.description}</p>
                    </div>
                </div>
            </header>

            <nav className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                {['members', 'notices', 'posts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                                ? 'bg-[#4f6ef7] text-white shadow-lg shadow-[#4f6ef7]/20'
                                : 'text-[#6b6b8a] hover:text-white'
                            }`}
                    >
                        {tab} ({content[tab].length})
                    </button>
                ))}
            </nav>

            <div className="bg-[#12121a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {activeTab === 'members' && (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">사용자</th>
                                <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">상태</th>
                                <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">가입일</th>
                                <th className="px-8 py-4 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {content.members.map(m => (
                                <tr key={m._id} className="hover:bg-white/[0.02]">
                                    <td className="px-8 py-4">
                                        <p className="text-sm font-bold text-white">{m.userId?.name}</p>
                                        <p className="text-[10px] font-mono text-[#6b6b8a]">{m.userId?.username}</p>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`text-[9px] font-black uppercase ${m.userId?.status === 'active' ? 'text-[#06d6a0]' : 'text-red-500'}`}>
                                            {m.userId?.status || 'active'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-[10px] font-bold text-[#6b6b8a]">
                                        {new Date(m.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-4">
                                        {m.userId?.role !== 'admin' && (
                                            <button onClick={() => handleKickMember(m.userId?._id)} className="text-red-500 hover:text-white text-[10px] font-bold">추방</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'notices' && (
                    <div className="divide-y divide-white/5">
                        {content.notices.map(n => (
                            <div key={n._id} className="p-8 hover:bg-white/[0.02] flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">{n.title}</h3>
                                    <p className="text-sm text-[#8080a0] line-clamp-2 mb-4">{n.content}</p>
                                    <div className="flex gap-4 text-[10px] font-bold text-[#6b6b8a]">
                                        <span>✍️ {n.authorId?.name}</span>
                                        <span>📅 {new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteNotice(n._id)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-bold border border-red-500/20 transition-all">
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="divide-y divide-white/5">
                        {content.posts.map(p => (
                            <div key={p._id} className="p-8 hover:bg-white/[0.02] flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-white mb-4 whitespace-pre-wrap">{p.content}</p>
                                    <div className="flex gap-4 text-[10px] font-bold text-[#6b6b8a]">
                                        <span>✍️ {p.authorId?.name}</span>
                                        <span>💬 {p.comments?.length || 0} Comments</span>
                                        <span>📅 {new Date(p.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeletePost(p._id)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-bold border border-red-500/20 transition-all">
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminChannelDetail;
