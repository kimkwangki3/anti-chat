import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';
import * as XLSX from 'xlsx';

const PollPage = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const [polls, setPolls] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // 투표 생성 폼 상태
    const [newPoll, setNewPoll] = useState({
        title: '',
        options: ['', '', ''],
        isMultipleSelection: false,
        isAnonymous: false,
        allowAddOption: false,
        expiresAt: ''
    });

    useEffect(() => {
        if (channelId) {
            fetchPolls();
        }
    }, [channelId]);

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

            // 만약 익명투표라면 요약만 제공 가능하지만, 여기서는 요청에 따라 관리자에게 제공 시도
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

    return (
        <div className="h-full bg-[#1a1a24] overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                        Poll <span className="text-[#FF8C69]">Tab</span>
                    </h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">채널의 소중한 의견을 모아주세요</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 bg-[#FF8C69] text-white text-xs font-black rounded-2xl shadow-xl shadow-[#FF8C69]/20 hover:scale-105 transition-transform uppercase tracking-widest"
                    >
                        + 새로운 투표 개최
                    </button>
                )}
            </header>

            <div className="space-y-12">
                {/* 진행 중인 투표 */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-8 bg-[#06d6a0] rounded-full"></div>
                        <h2 className="text-xl font-bold text-white tracking-tight italic">Active Polls</h2>
                    </div>
                    {isLoading && polls.length === 0 ? (
                        <div className="p-12 text-center text-[#6b6b8a] animate-pulse uppercase text-[10px] font-black tracking-widest">Loading polls...</div>
                    ) : polls.filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date()).length === 0 ? (
                        <div className="py-12 bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem] text-center">
                            <p className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-widest">현재 진행 중인 투표가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {polls.filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date()).map(poll => (
                                <PollCard
                                    key={poll._id}
                                    poll={poll}
                                    onVote={handleVote}
                                    onExport={() => handleExport(poll._id, poll.title)}
                                    isAdmin={user?.role === 'admin' || user?.role === 'superadmin'}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* 완료된 투표 */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-8 bg-white/10 rounded-full"></div>
                        <h2 className="text-xl font-bold text-white tracking-tight italic opacity-50">Closed Polls</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {polls.filter(p => p.status === 'closed' || new Date(p.expiresAt) <= new Date()).map(poll => (
                            <PollCard
                                key={poll._id}
                                poll={poll}
                                isClosed={true}
                                onExport={() => handleExport(poll._id, poll.title)}
                                isAdmin={user?.role === 'admin' || user?.role === 'superadmin'}
                            />
                        ))}
                    </div>
                </section>
            </div>

            {/* 투표 생성 모달 */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black text-white mb-8 italic">CREATE NEW POLL</h2>
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

                            <button className="w-full py-5 orange-gradient text-white font-black rounded-2xl shadow-xl shadow-[#FF8C69]/20 hover:scale-105 transition-transform uppercase tracking-widest text-xs mt-4">
                                투표 개최하기
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const PollCard = ({ poll, onVote, onExport, isClosed, isAdmin }) => {
    const [selected, setSelected] = useState([]);
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
                        {isClosed ? '투표 종료됨' : `마감일: ${new Date(poll.expiresAt).toLocaleString()}`} • {totalVotes}명 참여
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={onExport}
                        className="hidden md:block text-[10px] font-bold text-[#FF8C69] hover:underline uppercase tracking-widest"
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
                                <span className={`text-sm font-bold transition-colors ${selected.includes(opt.text) ? 'text-[#FF8C69]' : 'text-white'}`}>
                                    {opt.text}
                                    {isVoted && poll.myVote.includes(opt.text) && <span className="ml-2 text-[10px] text-[#FF8C69] font-black">✓ MY CHOICE</span>}
                                </span>
                                {(isVoted || isClosed) && <span className="text-xs font-mono font-black text-[#6b6b8a]">{percentage}% ({opt.count})</span>}
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${selected.includes(opt.text) ? 'bg-[#FF8C69]' : 'bg-[#444466]'} ${isClosed ? 'bg-white/20' : ''}`}
                                    style={{ width: `${(isVoted || isClosed) ? percentage : (selected.includes(opt.text) ? 100 : 0)}%` }}
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
                    className={`w-full py-4 rounded-2xl text-[11px] font-black transition-all uppercase tracking-widest ${selected.length > 0 ? 'bg-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/20' : 'bg-white/5 text-[#3a3a4a] cursor-not-allowed'}`}
                >
                    투표 완료하기
                </button>
            )}
        </div>
    );
};

export default PollPage;
