import { useState, useEffect } from 'react';
import axios from '../api/axios';

const SuperAdminChannels = () => {
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const { data } = await axios.get('/api/superadmin/channels');
            setChannels(data);
        } catch (error) {
            console.error('Fetch channels failed:', error);
            alert('채널 목록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full bg-[#1a1a24] p-6 md:p-10 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">Channel Matrix 🌐</h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">Global channel oversight</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 text-[#FF8C69]">
                    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {channels.map((channel) => (
                        <div
                            key={channel._id}
                            className="bg-[#23232f] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-[#FF8C69]/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-white/5 border border-[#FF8C69]/10">
                                        <span className="drop-shadow-sm">🍑</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{channel.name}</h3>
                                        <p className="text-xs text-[#6b6b8a] line-clamp-1">{channel.description}</p>
                                    </div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Active</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                                <div className="bg-black/20 rounded-2xl p-4 text-center">
                                    <p className="text-[9px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-1">Members</p>
                                    <p className="text-xl font-black text-white">{channel.stats.memberCount}</p>
                                </div>
                                <div className="bg-black/20 rounded-2xl p-4 text-center">
                                    <p className="text-[9px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-1">Posts</p>
                                    <p className="text-xl font-black text-white">{channel.stats.postCount}</p>
                                </div>
                                <div className="bg-black/20 rounded-2xl p-4 text-center">
                                    <p className="text-[9px] font-bold text-[#4a4a6a] uppercase tracking-widest mb-1">Notices</p>
                                    <p className="text-xl font-black text-white">{channel.stats.noticeCount}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest font-mono">
                                <span>CREATED: {new Date(channel.createdAt).toLocaleDateString()}</span>
                                <span className="opacity-30">|</span>
                                <span>TYPE: {channel.isPublic ? 'PUBLIC' : 'PRIVATE'}</span>
                            </div>

                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none scale-150 origin-top-right">
                                <span className="text-9xl font-black italic uppercase font-mono leading-none">PEACH</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {channels.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-[#6b6b8a]">
                    <span className="text-4xl mb-4">🌑</span>
                    <p className="text-sm font-bold uppercase tracking-widest">생성된 채널이 없습니다.</p>
                </div>
            )}
        </div>
    );
};

export default SuperAdminChannels;
