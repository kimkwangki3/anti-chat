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
                <h1 className="text-4xl font-bold font-mono tracking-wider mb-2 uppercase italic text-white">채널 <span className="text-[#4f6ef7]">탐색</span> 부</h1>
                <p className="text-[#6b6b8a] text-[10px] font-mono tracking-[0.3em] uppercase ml-1">가입할 새로운 커뮤니티를 검색하세요</p>
            </header>

            <form onSubmit={handleSearch} className="mb-12 relative group max-w-2xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
                <div className="relative flex gap-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="채널 이름 또는 키워드로 검색..."
                        className="flex-1 bg-[#12121a] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#4f6ef7]/40 transition-all shadow-2xl placeholder:text-[#333344] font-medium"
                    />
                    <button
                        type="submit"
                        className="px-8 bg-[#4f6ef7] text-white font-black rounded-2xl hover:bg-[#5f7ef7] transition-all shadow-lg shadow-[#4f6ef7]/20 uppercase text-[11px] tracking-widest active:scale-95"
                    >
                        데이터 검색
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 bg-[#12121a] rounded-3xl animate-pulse border border-white/5 shadow-xl"></div>)
                ) : searchResults.length === 0 ? (
                    <div className="col-span-full py-40 text-center">
                        <span className="text-5xl block mb-6 opacity-20">📡</span>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-[#333344]">일치하는 데이터가 없습니다</p>
                    </div>
                ) : (
                    searchResults.map((channel) => {
                        const membershipStatus = getMembershipStatus(channel._id);
                        const isOwner = user?._id === channel.ownerId?._id;

                        return (
                            <div
                                key={channel._id}
                                className="bg-[#12121a] p-8 border rounded-[2.5rem] transition-all group relative overflow-hidden flex flex-col h-full shadow-2xl"
                                style={{
                                    borderColor: `${channel.cardColor || '#4f6ef7'}1A`,
                                    boxShadow: `0 25px 50px -12px ${channel.cardColor || '#4f6ef7'}10`
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${channel.cardColor || '#4f6ef7'}66`}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = `${channel.cardColor || '#4f6ef7'}1A`}
                            >
                                <div
                                    className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] pointer-events-none transition-all"
                                    style={{ backgroundColor: `${channel.cardColor || '#4f6ef7'}10` }}
                                ></div>
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <span className="text-[9px] font-black text-[#444466] uppercase tracking-[0.2em]">
                                        {isOwner ? '관리 중인 채널' : '참가 가능한 채널'}
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full">
                                        <span className={`w-1.5 h-1.5 rounded-full ${channel.ownerId?.isOnline ? 'bg-[#06d6a0] shadow-[0_0_8px_#06d6a0]' : 'bg-[#333344]'}`}></span>
                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${channel.ownerId?.isOnline ? 'text-[#06d6a0]' : 'text-[#333344]'}`}>
                                            MASTER {channel.ownerId?.isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                    {channel.profileImage ? (
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/5 shadow-inner flex-shrink-0">
                                            <img src={channel.profileImage} alt={channel.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0"
                                            style={{ backgroundColor: `${channel.cardColor || '#4f6ef7'}20` }}
                                        >
                                            📡
                                        </div>
                                    )}
                                    <h3
                                        className="text-2xl font-black text-white group-hover:text-[#4f6ef7] transition-colors leading-tight"
                                        style={{ '--tw-text-opacity': '1', color: 'white' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = channel.cardColor || '#4f6ef7'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                                    >{channel.name}</h3>
                                </div>

                                <p className="text-[#6b6b8a] text-xs leading-relaxed mb-10 flex-1 font-medium italic">{channel.description}</p>

                                <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-6 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border"
                                            style={{
                                                backgroundColor: `${channel.cardColor || '#4f6ef7'}1A`,
                                                color: channel.cardColor || '#4f6ef7',
                                                borderColor: `${channel.cardColor || '#4f6ef7'}20`
                                            }}
                                        >
                                            {channel.ownerId?.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white leading-none">{channel.ownerId?.name}</p>
                                            <p className="text-[8px] text-[#444466] font-mono leading-none mt-1">OWNER</p>
                                        </div>
                                    </div>

                                    {!isOwner && (
                                        membershipStatus === 'approved' ? (
                                            <span className="px-5 py-2.5 bg-[#06d6a0]/5 text-[#06d6a0] border border-[#06d6a0]/10 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-[#06d6a0]/5">
                                                참여 중
                                            </span>
                                        ) : membershipStatus === 'pending' ? (
                                            <span className="px-5 py-2.5 bg-yellow-500/5 text-yellow-500 border border-yellow-500/10 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-yellow-500/5">
                                                승인 대기
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinRequest(channel._id)}
                                                className="px-5 py-2.5 text-white text-[10px] font-black rounded-xl transition-all shadow-xl uppercase tracking-widest active:scale-95"
                                                style={{
                                                    backgroundColor: channel.cardColor || '#4f6ef7',
                                                    boxShadow: `0 10px 15px -3px ${channel.cardColor || '#4f6ef7'}40`
                                                }}
                                            >
                                                가입 신청
                                            </button>
                                        )
                                    )}
                                    {isOwner && (
                                        <span
                                            className="px-5 py-2.5 border text-[10px] font-black rounded-xl uppercase tracking-widest"
                                            style={{
                                                backgroundColor: `${channel.cardColor || '#4f6ef7'}1A`,
                                                color: channel.cardColor || '#4f6ef7',
                                                borderColor: `${channel.cardColor || '#4f6ef7'}20`
                                            }}
                                        >
                                            내 채널
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
