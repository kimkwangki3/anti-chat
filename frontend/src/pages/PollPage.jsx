import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';
import * as XLSX from 'xlsx';

const PollPage = () => {
    const { user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const [polls, setPolls] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [channelRole, setChannelRole] = useState('none');

    // 투표 생성 폼 상태
    const [newPoll, setNewPoll] = useState({
        title: '',
        options: ['', '', ''],
        isMultipleSelection: false,
        isAnonymous: false,
        allowAddOption: false,
        expiresAt: ''
    });

    const { resetUnreadCount } = useNotificationStore();

    useEffect(() => {
        if (channelId) {
            fetchPolls();
            fetchChannelRole();
            resetUnreadCount(channelId, 'notice');
            markAllPollsRead();
        }
    }, [channelId]);

    const markAllPollsRead = async () => {
        try {
            await axios.patch(`/polls/channel/${channelId}/read-all`);
        } catch (error) {
            console.error('Mark all polls read failed:', error);
        }
    };

    const fetchChannelRole = async () => {
        try {
            const { data } = await axios.get(`/channel-members/role/${channelId}`);
            setChannelRole(data.role);
        } catch (error) {
            console.error('Fetch role failed:', error);
        }
    };

    const fetchPolls = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/polls/channel/${channelId}`);
            setPolls(data);
        } catch (error) {
            console.error('Fetch polls failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePoll = async (e) => {
        e.preventDefault();
        const filteredOptions = newPoll.options.filter(opt => opt.trim() !== '');
        if (filteredOptions.length < 2) return alert('최소 2개 이상의 항목을 입력해주세요.');
        if (!newPoll.expiresAt) return alert('투표 종료 시간을 설정해주세요.');

        try {
            await axios.post('/polls', {
                ...newPoll,
                channelId,
                options: filteredOptions
            });
            setIsCreateModalOpen(false);
            setNewPoll({
                title: '',
                options: ['', '', ''],
                isMultipleSelection: false,
                isAnonymous: false,
                allowAddOption: false,
                expiresAt: ''
            });
            fetchPolls();
        } catch (error) {
            alert('투표 생성 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleVote = async (pollId, selectedOptions) => {
        if (selectedOptions.length === 0) return;
        try {
            await axios.post(`/polls/${pollId}/vote`, { selectedOptions });
            fetchPolls();
        } catch (error) {
            alert('투표 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleExport = async (pollId, title) => {
        try {
            const { data } = await axios.get(`/polls/${pollId}/details`);
            const { poll, votes } = data;

            const exportData = votes.map(v => ({
                'Name': v.userId?.name || 'Unknown',
                'Username': v.userId?.username || 'Unknown',
                'Options': v.selectedOptions.join(', '),
                'Voted At': new Date(v.createdAt).toLocaleString()
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
            XLSX.writeFile(workbook, `Poll_Results_${title.replace(/\s/g, '_')}.xlsx`);
        } catch (error) {
            alert('엑셀 추출 실패: ' + (error.response?.data?.message || error.message));
        }
    };

    if (!channelId) return (
        <div className="h-full flex items-center justify-center bg-[#1a1a24] text-[#6b6b8a] flex-col gap-4">
            <div className="w-20 h-20 bg-[#23232f] rounded-[2.5rem] flex items-center justify-center text-3xl shadow-inner">⚠️</div>
            <p className="font-bold uppercase tracking-widest text-xs">채널 정보가 없습니다.</p>
        </div>
    );

    const themeColor = currentChannel?.cardColor || '#FF8C69';

    return (
        <div className="flex flex-col h-full bg-[#1a1a24] text-[#e8e8f0]">
            <header className="p-6 md:p-10 flex justify-between items-end border-b border-white/5 bg-[#1a1a24]/80 backdrop-blur-md sticky top-0 z-20">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="p-1 px-2 text-[10px] font-bold rounded-md border font-mono italic"
                            style={{ backgroundColor: `${themeColor}1A`, color: themeColor, borderColor: `${themeColor}33` }}
                        >
                            INTERACTIVE
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#06d6a0] rounded-full animate-pulse shadow-[0_0_8px_rgba(6,214,160,0.5)]"></span>
                            <span className="text-[9px] font-bold text-[#06d6a0] font-mono uppercase tracking-[0.2em]">
                                활발한 참여 중
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {currentChannel?.name || '채널'} <span style={{ color: themeColor }}>투표</span>
                    </h1>
                </div>
                {(channelRole === 'admin' || user?.role === 'superadmin') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-4 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-white font-bold"
                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px ${themeColor}40` }}
                    >
                        + 신규 투표 생성
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
                <div className="space-y-12">
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themeColor }}></div>
                            <h2 className="text-xl font-bold text-white tracking-tight italic">진행 중인 투표</h2>
                        </div>
                        {isLoading && polls.length === 0 ? (
                            <div className="p-12 text-center text-[#6b6b8a] animate-pulse uppercase text-[10px] font-black tracking-widest">불러오는 중...</div>
                        ) : polls.filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date()).length === 0 ? (
                            <div className="py-12 bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem] text-center">
                                <p className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-widest">진행 중인 투표가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {polls.filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date()).map(poll => (
                                    <PollCard
                                        key={poll._id}
                                        poll={poll}
                                        onVote={handleVote}
                                        onExport={() => handleExport(poll._id, poll.title)}
                                        isAdmin={channelRole === 'admin' || user?.role === 'superadmin'}
                                        themeColor={themeColor}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {(channelRole === 'admin' || user?.role === 'superadmin') && (
                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-2 h-8 bg-white/10 rounded-full"></div>
                                <h2 className="text-xl font-bold text-white tracking-tight italic opacity-50">종료된 투표</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                {polls.filter(p => p.status === 'closed' || new Date(p.expiresAt) <= new Date()).map(poll => (
                                    <PollCard
                                        key={poll._id}
                                        poll={poll}
                                        isClosed={true}
                                        onExport={() => handleExport(poll._id, poll.title)}
                                        isAdmin={true}
                                        themeColor={themeColor}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}></div>
                        <div className="relative w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-black text-white mb-8 italic">신규 투표 만들기</h2>
                            <form onSubmit={handleCreatePoll} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-[#444466] uppercase tracking-[0.2em] mb-3">투표 제목</label>
                                    <input
                                        type="text"
                                        value={newPoll.title}
                                        onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                                        placeholder="투표 주제를 입력하세요..."
                                        className="w-full bg-[#23232f] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#FF8C69]/30"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#444466] uppercase tracking-[0.2em] mb-3">항목 설정</label>
                                    <div className="space-y-3">
                                        {newPoll.options.map((opt, idx) => (
                                            <input
                                                key={idx}
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const opts = [...newPoll.options];
                                                    opts[idx] = e.target.value;
                                                    setNewPoll({ ...newPoll, options: opts });
                                                }}
                                                placeholder={`옵션 ${idx + 1}`}
                                                className="w-full bg-[#23232f] border border-white/5 rounded-xl px-6 py-3 text-xs text-white"
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
                                            className="text-[10px] font-bold text-[#FF8C69] hover:underline"
                                        >
                                            + 항목 추가
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setNewPoll({ ...newPoll, isMultipleSelection: !newPoll.isMultipleSelection })}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${newPoll.isMultipleSelection ? 'bg-[#FF8C69]/10 border-[#FF8C69] text-[#FF8C69]' : 'bg-white/5 border-transparent text-[#6b6b8a]'}`}
                                    >
                                        <p className="text-[10px] font-black uppercase text-center">복수 선택</p>
                                    </div>
                                    <div
                                        onClick={() => setNewPoll({ ...newPoll, isAnonymous: !newPoll.isAnonymous })}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${newPoll.isAnonymous ? 'bg-[#FF8C69]/10 border-[#FF8C69] text-[#FF8C69]' : 'bg-white/5 border-transparent text-[#6b6b8a]'}`}
                                    >
                                        <p className="text-[10px] font-black uppercase text-center">익명 투표</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[#444466] uppercase tracking-[0.2em] mb-3">종료 시간</label>
                                    <input
                                        type="datetime-local"
                                        value={newPoll.expiresAt}
                                        onChange={(e) => setNewPoll({ ...newPoll, expiresAt: e.target.value })}
                                        className="w-full bg-[#23232f] border border-white/5 rounded-2xl px-6 py-4 text-xs text-white"
                                        required
                                    />
                                </div>

                                <button
                                    className="w-full py-5 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs mt-4"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px ${themeColor}40` }}
                                >
                                    투표 개최하기
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PollCard = ({ poll, onVote, onExport, isClosed, isAdmin, themeColor }) => {
    const [selected, setSelected] = useState(poll.myVote || []);
    const totalVotes = poll.options.reduce((sum, o) => sum + o.count, 0);

    const toggleOption = (text) => {
        if (poll.isMultipleSelection) {
            setSelected(prev => prev.includes(text) ? prev.filter(t => t !== text) : [...prev, text]);
        } else {
            setSelected([text]);
        }
    };

    return (
        <div className={`bg-[#23232f] border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-xl transition-all relative overflow-hidden ${isClosed ? 'opacity-60' : ''}`}>
            {poll.isAnonymous && <span className="absolute top-6 right-8 text-[8px] font-black bg-white/5 text-[#6b6b8a] px-3 py-1 rounded-full uppercase tracking-widest">Anonymous</span>}

            <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{poll.title}</h3>
                    <p className="text-[10px] text-[#444466] font-mono font-bold">
                        {isClosed ? '투표 종료됨' : `마감일: ${new Date(poll.expiresAt).toLocaleString()}`}
                        {isAdmin && ` • ${totalVotes}명 참여`}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={onExport}
                        className="hidden md:block text-[10px] font-bold hover:underline uppercase tracking-widest"
                        style={{ color: themeColor }}
                    >
                        Export Excel
                    </button>
                )}
            </div>

            <div className="space-y-4 mb-8">
                {poll.options.map((opt, idx) => {
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.count / totalVotes) * 100);
                    const isVoted = poll.hasVoted;

                    return (
                        <div
                            key={idx}
                            onClick={() => !isVoted && !isClosed && toggleOption(opt.text)}
                            className={`relative group cursor-pointer ${isVoted || isClosed ? 'cursor-default' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-sm font-bold transition-colors text-white">
                                    {opt.text}
                                    {isVoted && poll.myVote?.includes(opt.text) && (
                                        <span className="ml-2 text-[10px] font-black" style={{ color: themeColor }}>✓ MY CHOICE</span>
                                    )}
                                </span>
                                {(isClosed) && isAdmin && <span className="text-xs font-mono font-black text-[#6b6b8a]">{percentage}% ({opt.count})</span>}
                                {!isClosed && poll.hasVoted && isAdmin && <span className="text-xs font-mono font-black text-[#6b6b8a]">{percentage}% ({opt.count})</span>}
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isClosed ? 'bg-white/20' : ''}`}
                                    style={{
                                        width: `${(isAdmin && (poll.hasVoted || isClosed)) ? percentage : (selected.includes(opt.text) ? 100 : 0)}%`,
                                        backgroundColor: selected.includes(opt.text) ? themeColor : '#444466'
                                    }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!poll.hasVoted && !isClosed && (
                <button
                    onClick={() => onVote(poll._id, selected)}
                    disabled={selected.length === 0}
                    className={`w-full py-4 rounded-2xl text-[11px] font-black transition-all uppercase tracking-widest ${selected.length > 0 ? 'text-white' : 'bg-white/5 text-[#3a3a4a] cursor-not-allowed'}`}
                    style={selected.length > 0 ? { backgroundColor: themeColor, boxShadow: `0 10px 15px ${themeColor}40` } : {}}
                >
                    투표 완료하기
                </button>
            )}
        </div>
    );
};

export default PollPage;
