import { useEffect, useState } from 'react';
import axios from '../api/axios';
import * as XLSX from 'xlsx';

const SuperAdminPolls = () => {
    const [polls, setPolls] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get('/polls/superadmin/all');
            setPolls(data);
        } catch (error) {
            console.error('Fetch all polls failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (pollId, title) => {
        try {
            const { data } = await axios.get(`/polls/${pollId}/details`);
            const { votes } = data;

            const exportData = votes.map(v => ({
                'Channel': v.pollId?.channelId?.name || 'Unknown',
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
            alert('엑셀 추출 실패');
        }
    };

    return (
        <div className="h-full bg-[#0a0a0f] overflow-y-auto p-6 md:p-12 custom-scrollbar">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                    시스템 <span className="text-[#FF8C69]">투표</span> 부 👑
                </h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">전체 채널의 실시간 투표 현황을 제어합니다.</p>
            </header>

            {isLoading ? (
                <div className="py-20 text-center text-[#3a3a4a] font-black uppercase tracking-widest animate-pulse">Infrastructure Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {polls.map(poll => (
                        <div key={poll._id} className="bg-[#12121a] border border-white/5 rounded-[2.5rem] p-8 shadow-xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[8px] font-black bg-[#FF8C69]/10 text-[#FF8C69] px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
                                        {poll.channelId?.name || '알 수 없는 채널'}
                                    </span>
                                    <h3 className="text-xl font-bold text-white mb-1">{poll.title}</h3>
                                    <p className="text-[10px] text-[#444466] font-mono font-bold">
                                        {poll.status === 'active' ? '진행 중' : '종료됨'} • {new Date(poll.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleExport(poll._id, poll.title)}
                                    className="text-[10px] font-black text-[#FF8C69] hover:text-[#e8735a] transition-colors uppercase tracking-widest bg-[#FF8C69]/10 px-3 py-1.5 rounded-lg border border-[#FF8C69]/20"
                                >
                                    엑셀 다운로드
                                </button>
                            </div>

                            <div className="space-y-3">
                                {poll.options.map((opt, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                        <span className="text-[#6b6b8a]">{opt.text}</span>
                                        <span className="text-white font-bold">{opt.count}표</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SuperAdminPolls;
