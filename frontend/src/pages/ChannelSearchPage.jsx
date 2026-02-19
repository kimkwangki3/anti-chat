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
            fetchMyChannels(); // 가입 상태 갱신
        } else {
            alert('이미 가입 신청하셨거나 멤버인 채널입니다.');
        }
    };

    const getMembershipStatus = (channelId) => {
        const membership = myChannels.find(m => m.channelId?._id === channelId);
        return membership ? membership.status : null;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-bold font-['Bebas_Neue'] tracking-wider mb-2 uppercase italic text-white">SEARCH <span className="text-[#4f6ef7]">CHANNELS</span></h1>
                <p className="text-[#a0a0c0] text-[10px] font-mono tracking-[0.3em] uppercase ml-1">가입할 새로운 채널을 탐색하세요</p>
            </header>

            <form onSubmit={handleSearch} className="mb-12 relative group max-w-2xl">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                <div className="relative flex gap-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="채널 이름으로 검색..."
                        className="flex-1 bg-[#12121a] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#4f6ef7]/50 transition-all shadow-2xl"
                    />
                    <button
                        type="submit"
                        className="px-8 bg-[#4f6ef7] text-white font-bold rounded-2xl hover:bg-[#7bb3ff] transition-all shadow-lg shadow-[#4f6ef7]/20 uppercase text-xs tracking-widest"
                    >
                        전송
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 bg-[#12121a] rounded-2xl animate-pulse border border-white/5"></div>)
                ) : searchResults.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <p className="text-sm font-bold uppercase tracking-widest font-mono text-[#a0a0c0]">검색 결과가 없습니다</p>
                    </div>
                ) : (
                    searchResults.map((channel) => {
                        const membershipStatus = getMembershipStatus(channel._id);
                        const isOwner = user?._id === channel.ownerId?._id;

                        return (
                            <div
                                key={channel._id}
                                className="bg-[#12121a] p-8 border border-white/5 rounded-3xl hover:border-[#4f6ef7]/30 transition-all group relative overflow-hidden flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[9px] font-mono text-[#444466] uppercase tracking-[0.2em] font-bold">
                                        {isOwner ? 'MY CHANNEL' : 'PUBLIC CHANNEL'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${channel.ownerId?.isOnline ? 'bg-[#06d6a0]' : 'bg-gray-600'}`}></span>
                                        <span className="text-[9px] font-mono text-[#8080a0] uppercase">관리자 {channel.ownerId?.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold mb-3 text-[#e8e8f0] group-hover:text-[#4f6ef7] transition-colors">{channel.name}</h3>
                                <p className="text-[#a0a0c0] text-xs leading-relaxed mb-8 flex-1">{channel.description}</p>

                                <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-[#4f6ef7]/10 flex items-center justify-center text-[10px] font-bold text-[#4f6ef7] border border-[#4f6ef7]/20 uppercase">
                                            {channel.ownerId?.name?.[0]}
                                        </div>
                                        <span className="text-[10px] font-bold text-[#e8e8f0]">{channel.ownerId?.name}</span>
                                    </div>

                                    {!isOwner && (
                                        membershipStatus === 'approved' ? (
                                            <span className="px-6 py-2 bg-[#06d6a0]/10 text-[#06d6a0] border border-[#06d6a0]/20 text-[10px] font-bold rounded-xl uppercase tracking-widest">
                                                가입 완료
                                            </span>
                                        ) : membershipStatus === 'pending' ? (
                                            <span className="px-6 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold rounded-xl uppercase tracking-widest">
                                                승인 대기 중
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinRequest(channel._id)}
                                                className="px-6 py-2 bg-[#4f6ef7]/10 text-[#4f6ef7] border border-[#4f6ef7]/20 text-[10px] font-bold rounded-xl hover:bg-[#4f6ef7] hover:text-white transition-all shadow-lg hover:shadow-[#4f6ef7]/20 uppercase tracking-widest"
                                            >
                                                가입 신청
                                            </button>
                                        )
                                    )}
                                    {isOwner && (
                                        <span className="px-6 py-2 bg-[#4f6ef7]/20 text-[#4f6ef7] border border-[#4f6ef7]/30 text-[10px] font-bold rounded-xl uppercase tracking-widest">
                                            관리 중
                                        </span>
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
