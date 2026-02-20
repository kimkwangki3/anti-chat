import { useState } from 'react';
import axios from '../api/axios';

const SuperAdminChats = () => {
    const [searchParams, setSearchParams] = useState({ channelName: '', userName: '' });
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedChannelMessages, setSelectedChannelMessages] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await axios.get('/superadmin/chats/search', { params: searchParams });
            setMessages(data);
            setSelectedChannelMessages(null);
        } catch (error) {
            console.error('Chat search failed:', error);
            alert('채팅 내역 검색에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const viewFullContext = async (channelId, channelName) => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/superadmin/channels/${channelId}/messages`);
            setSelectedChannelMessages({
                name: channelName,
                list: data
            });
        } catch (error) {
            console.error('Fetch context failed:', error);
            alert('대화 내용을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full bg-[#1a1a24] p-6 md:p-10 overflow-hidden flex flex-col">
            {/* Header & Search */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">Chat Inspector 🔍</h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">Deep dive into communications</p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="채널명 검색"
                        className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] w-40"
                        value={searchParams.channelName}
                        onChange={(e) => setSearchParams({ ...searchParams, channelName: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="작성자명 검색"
                        className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] w-40"
                        value={searchParams.userName}
                        onChange={(e) => setSearchParams({ ...searchParams, userName: e.target.value })}
                    />
                    <button
                        type="submit"
                        className="bg-[#FF8C69] text-white text-[10px] font-black px-6 py-3 rounded-xl shadow-lg shadow-[#FF8C69]/20 hover:scale-105 transition-all uppercase tracking-widest"
                    >
                        Search
                    </button>
                    {(messages.length > 0 || selectedChannelMessages) && (
                        <button
                            type="button"
                            onClick={() => { setMessages([]); setSelectedChannelMessages(null); setSearchParams({ channelName: '', userName: '' }); }}
                            className="bg-white/5 text-[#6b6b8a] text-[10px] font-black px-6 py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all uppercase tracking-widest"
                        >
                            Reset
                        </button>
                    )}
                </form>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-[#23232f] border border-white/5 rounded-[2.5rem] shadow-2xl relative flex flex-col">
                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-[#1a1a24]/50 backdrop-blur-sm flex items-center justify-center text-[#FF8C69]">
                        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {selectedChannelMessages ? (
                    /* Full Context View */
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="text-[#FF8C69]">#</span> {selectedChannelMessages.name} 전체 대화
                            </h3>
                            <button
                                onClick={() => setSelectedChannelMessages(null)}
                                className="text-[10px] font-bold text-[#6b6b8a] hover:text-white transition-all uppercase tracking-widest"
                            >
                                ← 목록으로 돌아가기
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {selectedChannelMessages.list.map((msg) => (
                                <div key={msg._id} className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-[#FF8C69]">{msg.sender?.name}</span>
                                        <span className="text-[9px] text-[#4a4a6a] font-mono">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-4 text-xs text-white/80 max-w-[80%]">
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : messages.length > 0 ? (
                    /* Search Results Table */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#23232f] z-10 border-b border-white/5">
                                <tr className="text-[10px] font-bold text-[#4a4a6a] uppercase tracking-widest">
                                    <th className="px-8 py-5">채널</th>
                                    <th className="px-8 py-5">발신자</th>
                                    <th className="px-8 py-5">내용</th>
                                    <th className="px-8 py-5">일시</th>
                                    <th className="px-8 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {messages.map((msg) => (
                                    <tr key={msg._id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-[#FF8C69]">#{msg.channelId?.name}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white">{msg.sender?.name}</span>
                                                <span className="text-[9px] text-[#4a4a6a] font-mono">{msg.sender?.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-[#a0a0c0] line-clamp-1 max-w-md">{msg.content}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] text-[#4a4a6a] font-mono">{new Date(msg.createdAt).toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => viewFullContext(msg.channelId?._id, msg.channelId?.name)}
                                                className="opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-[#FF8C69]/20 text-[#FF8C69] text-[9px] font-black px-4 py-2 rounded-lg transition-all uppercase tracking-widest"
                                            >
                                                View Context
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-[#6b6b8a]">
                        {!isLoading && (
                            <>
                                <span className="text-5xl mb-6 opacity-30">🕵️‍♂️</span>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-2">Search Communications</h3>
                                <p className="text-[11px] text-center max-w-xs leading-relaxed">
                                    조건을 입력하고 검색 버튼을 눌러주세요.<br />채널명 또는 유저명으로 정밀 추적이 가능합니다.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminChats;
