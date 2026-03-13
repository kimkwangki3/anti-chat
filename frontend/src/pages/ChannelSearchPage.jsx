import { useState, useEffect } from 'react';
import useChannelStore from '../store/channelStore';
import useAuthStore from '../store/authStore';

const ChannelSearchPage = () => {
    const [query, setQuery] = useState('');
    const { searchChannels, searchResults, joinChannel, isLoading, myChannels, fetchMyChannels } = useChannelStore();
    const { user } = useAuthStore();

    useEffect(() => {
        searchChannels('');
        if (user?._id) {
            fetchMyChannels();
        }
    }, [searchChannels, fetchMyChannels, user?._id]);

    const handleSearch = (e) => {
        e.preventDefault();
        searchChannels(query);
    };

    const handleJoinRequest = async (channelId) => {
        const success = await joinChannel(channelId);
        if (success) {
            alert('가입 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.');
            fetchMyChannels();
        } else {
            alert('이미 가입 신청하셨거나 멤버인 채널입니다.');
        }
    };

    const getMembershipStatus = (channelId) => {
        const membership = myChannels.find(m => m.channelId?._id === channelId || m.channelId === channelId);
        return membership ? membership.status : null;
    };

    const visibleResults = searchResults.filter((channel) => channel.name !== '__SUPERADMIN_DM__');

    return (
        <div className="page-container p-6 md:p-10 pb-24 md:pb-10 pt-safe">
            <header className="mb-12 animate-slide-up">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-2 h-2 bg-[#FF8C69] rounded-full shadow-[0_0_10px_#FF8C69]"></span>
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Discovery Protocol</h2>
                </div>
                <h1 className="text-4xl font-black text-white/95 tracking-tight mb-2">
                    채널 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C69] to-[#E8735A]">탐색</span> 부 📡
                </h1>
                <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase ml-1">Connect with new communities in the network</p>
            </header>

            <form onSubmit={handleSearch} className="mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative group max-w-2xl">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8C69] to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                    <div className="relative flex gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="채널 이름 또는 키워드 입력..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#FF8C69]/40 focus:bg-white/[0.07] transition-all shadow-2xl placeholder:text-slate-600 font-medium"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="px-8 peach-button"
                        >
                            데이터 검색
                        </button>
                    </div>
                </div>
            </form>

            <div className="bento-grid !p-0 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 glass-card animate-pulse"></div>)
                ) : visibleResults.length === 0 ? (
                    <div className="col-span-full py-40 glass-card text-center border-dashed border-white/10">
                        <span className="text-6xl block mb-8 opacity-20">📡</span>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">일치하는 채널 데이터를 찾을 수 없습니다</p>
                    </div>
                ) : (
                    visibleResults.map((channel) => {
                        const status = getMembershipStatus(channel._id);
                        const isOwner = user?._id === (channel.ownerId?._id || channel.ownerId);

                        return (
                            <div
                                key={channel._id}
                                className="glass-card p-8 flex flex-col h-full group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-8xl group-hover:scale-125 transition-transform" style={{ color: channel.cardColor || '#FF8C69' }}>📡</div>

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        {isOwner ? 'My Node' : 'Public Node'}
                                    </span>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] shadow-[0_0_8px_#06d6a0]"></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#06d6a0]">
                                            CHANNEL OPEN
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 mb-4 group-hover:-translate-y-1 transition-transform">
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden glass-card !p-0 shadow-inner flex-shrink-0">
                                        {channel.profileImage ? (
                                            <img src={channel.profileImage} alt={channel.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl bg-white/5">🏘️</div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-[#FF8C69] transition-colors leading-tight truncate">{channel.name}</h3>
                                </div>

                                <p className="text-slate-500 text-xs leading-relaxed mb-10 flex-1 font-medium italic line-clamp-3">{channel.description}</p>

                                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl glass-card !p-0 flex items-center justify-center text-[10px] font-black border border-white/5">
                                            {channel.name?.[0]?.toUpperCase() || 'C'}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-white leading-none">{channel.name}</p>
                                            <p className="text-[8px] text-slate-600 font-black leading-none mt-1 uppercase tracking-tighter">Channel</p>
                                        </div>
                                    </div>

                                    {!isOwner ? (
                                        status === 'approved' ? (
                                            <div className="px-4 py-2 border border-[#06d6a0]/20 bg-[#06d6a0]/5 text-[#06d6a0] text-[9px] font-black rounded-xl uppercase tracking-widest">
                                                Active
                                            </div>
                                        ) : status === 'pending' ? (
                                            <div className="px-4 py-2 border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 text-[9px] font-black rounded-xl uppercase tracking-widest">
                                                Pending
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinRequest(channel._id)}
                                                className="px-5 py-2.5 bg-[#FF8C69] hover:bg-[#E8735A] text-white text-[9px] font-black rounded-xl transition-all shadow-lg shadow-[#FF8C69]/20 uppercase tracking-widest active:scale-95"
                                            >
                                                Request
                                            </button>
                                        )
                                    ) : (
                                        <div className="px-4 py-2 border border-[#FF8C69]/20 bg-[#FF8C69]/5 text-[#FF8C69] text-[9px] font-black rounded-xl uppercase tracking-widest">
                                            My Node
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChannelSearchPage;
