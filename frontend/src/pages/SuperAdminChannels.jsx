import { useState, useEffect } from 'react';
import axios from '../api/axios';

const SuperAdminChannels = () => {
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const { data } = await axios.get('/superadmin/channels');
            setChannels(data);
        } catch (error) {
            console.error('Fetch channels failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        channel.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase italic text-white">
                        CHANNEL <span className="text-[#4f6ef7]">OBSERVATORY</span> 🛰️
                    </h1>
                    <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">Universal Network Oversight</p>
                </div>

                <div className="relative group min-w-[300px]">
                    <input
                        type="text"
                        placeholder="채널 이름 또는 설명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#12121a] border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-[#4f6ef7]/50 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#4f6ef7] transition-colors">🔍</span>
                </div>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-[#12121a] rounded-3xl animate-pulse border border-white/5"></div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#12121a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">채널 정보</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">통계</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">설정</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">생성일</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">유형</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredChannels.map((channel) => (
                                    <tr key={channel._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#4f6ef7]/10 flex items-center justify-center text-2xl shadow-inner border border-[#4f6ef7]/10 group-hover:scale-110 transition-transform">
                                                    🏘️
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-white group-hover:text-[#4f6ef7] transition-colors truncate max-w-[200px]">{channel.name}</p>
                                                    <p className="text-[10px] text-[#6b6b8a] truncate max-w-[250px] font-medium mt-0.5">{channel.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="text-center px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                                                    <p className="text-[8px] font-black text-[#6b6b8a] uppercase tracking-tighter">Members</p>
                                                    <p className="text-xs font-bold text-white">{channel.stats?.memberCount || 0}</p>
                                                </div>
                                                <div className="text-center px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                                                    <p className="text-[8px] font-black text-[#6b6b8a] uppercase tracking-tighter">Posts</p>
                                                    <p className="text-xs font-bold text-white">{channel.stats?.postCount || 0}</p>
                                                </div>
                                                <div className="text-center px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                                                    <p className="text-[8px] font-black text-[#6b6b8a] uppercase tracking-tighter">Notices</p>
                                                    <p className="text-xs font-bold text-white">{channel.stats?.noticeCount || 0}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${channel.status !== 'withdrawn' ? 'bg-[#06d6a0] shadow-[0_0_8px_#06d6a0]' : 'bg-red-500'}`}></span>
                                                <span className={`text-[10px] font-black uppercase ${channel.status !== 'withdrawn' ? 'text-[#06d6a0]' : 'text-red-500'}`}>
                                                    {channel.status || 'ACTIVE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-[11px] font-bold text-[#6b6b8a] font-mono">
                                            {new Date(channel.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-[#4f6ef7]/10 text-[#4f6ef7] border border-[#4f6ef7]/20 text-[9px] font-black rounded-full uppercase tracking-widest leading-none">
                                                {channel.type || 'PUBLIC'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminChannels;
