import { useEffect, useState } from 'react';
import axios from '../api/axios';

const formatDate = (ymd) => {
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-');
    return `${y}. ${parseInt(m)}. ${parseInt(d)}`;
};
const formatTime = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const SuperAdminChats = () => {
    const [searchParams, setSearchParams] = useState({ channelName: '', userName: '' });
    const [dateGroups, setDateGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [convo, setConvo] = useState(null); // { channelName, memberName, date, messages }
    const [hasSearched, setHasSearched] = useState(false);

    const fetchByDate = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setConvo(null);
        try {
            const { data } = await axios.get('/superadmin/chats/by-date', { params: searchParams });
            setDateGroups(data);
            setHasSearched(true);
        } catch (error) {
            console.error('Chat log load failed:', error);
            alert('채팅 로그를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchByDate(); /* 최초 진입 시 전체 로드 */ }, []); // eslint-disable-line

    const openRoom = async (room, date) => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/superadmin/chats/room/${room.roomId}/messages`, { params: { date } });
            setConvo({ ...data, date });
        } catch (error) {
            console.error('Fetch conversation failed:', error);
            alert('대화 내용을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setSearchParams({ channelName: '', userName: '' });
        setConvo(null);
    };

    return (
        <div className="h-full bg-[#1a1a24] p-6 md:p-10 overflow-hidden flex flex-col">
            {/* Header & Search */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">대화 <span className="text-[#FF8C69]">조사</span> 부 🔍</h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">날짜별 · 채팅방별 대화 로그</p>
                </div>

                <form onSubmit={fetchByDate} className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="채널명 검색"
                        className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] w-40"
                        value={searchParams.channelName}
                        onChange={(e) => setSearchParams({ ...searchParams, channelName: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="회원명/아이디 검색"
                        className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] w-40"
                        value={searchParams.userName}
                        onChange={(e) => setSearchParams({ ...searchParams, userName: e.target.value })}
                    />
                    <button type="submit" className="bg-[#FF8C69] text-white text-[10px] font-black px-6 py-3 rounded-xl shadow-lg shadow-[#FF8C69]/20 hover:scale-105 transition-all uppercase tracking-widest">
                        조회
                    </button>
                    <button type="button" onClick={reset} className="bg-white/5 text-[#6b6b8a] text-[10px] font-black px-6 py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all uppercase tracking-widest">
                        초기화
                    </button>
                </form>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-[#23232f] border border-white/5 rounded-[2.5rem] shadow-2xl relative flex flex-col">
                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-[#1a1a24]/50 backdrop-blur-sm flex items-center justify-center text-[#FF8C69]">
                        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {convo ? (
                    /* 대화 내용 (해당 날짜) */
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="text-[#FF8C69]">#</span> {convo.channelName} · {convo.memberName}
                                </h3>
                                <p className="text-[10px] text-[#6b6b8a] font-mono mt-1">{formatDate(convo.date)} · 회원 ↔ 관리자 대화</p>
                            </div>
                            <button onClick={() => setConvo(null)} className="text-[10px] font-bold text-[#6b6b8a] hover:text-white transition-all uppercase tracking-widest">
                                ← 목록으로
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar overflow-x-hidden">
                            {convo.messages.length === 0 ? (
                                <p className="text-center text-[#6b6b8a] text-xs py-10">이 날짜에 대화가 없습니다.</p>
                            ) : convo.messages.map((m) => (
                                <div key={m._id} className={`flex flex-col ${m.isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className={`text-[10px] font-bold ${m.isAdmin ? 'text-[#FF8C69]' : 'text-[#7dd3fc]'}`}>{m.senderName}</span>
                                        <span className="text-[9px] text-[#4a4a6a] font-mono">{formatTime(m.createdAt)}</span>
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-xs max-w-[75%] ${m.isAdmin
                                        ? 'bg-[#FF8C69]/15 border border-[#FF8C69]/20 text-white rounded-tr-none'
                                        : 'bg-white/5 border border-white/5 text-white/80 rounded-tl-none'}`}>
                                        {m.fileUrl && (
                                            <p className="text-[10px] text-[#6b6b8a] mb-1">📎 {m.fileType?.startsWith('image/') ? '사진' : (m.fileName || '파일')}</p>
                                        )}
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : dateGroups.length > 0 ? (
                    /* 날짜별 → 채팅방 목록 */
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {dateGroups.map((group) => (
                            <div key={group.date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs font-black text-white tracking-widest">📅 {formatDate(group.date)}</span>
                                    <span className="flex-1 h-px bg-white/5"></span>
                                    <span className="text-[9px] text-[#4a4a6a] font-mono">{group.rooms.length}개 방</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {group.rooms.map((room) => (
                                        <button
                                            key={`${group.date}-${room.roomId}`}
                                            onClick={() => openRoom(room, group.date)}
                                            className="text-left glass-card p-4 hover:border-[#FF8C69]/30 transition-colors flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">
                                                    <span className="text-[#FF8C69]">#{room.channelName}</span> · {room.memberName}
                                                </p>
                                                <p className="text-[9px] text-[#4a4a6a] font-mono mt-0.5 truncate">{room.memberUsername}</p>
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] font-bold text-[#a0a0c0] bg-white/5 px-2.5 py-1 rounded-full">{room.count}건</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty */
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-[#6b6b8a]">
                        {!isLoading && (
                            <>
                                <span className="text-5xl mb-6 opacity-30">🕵️‍♂️</span>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-2">대화 기록 없음</h3>
                                <p className="text-[11px] text-center max-w-xs leading-relaxed">
                                    {hasSearched ? '조건에 맞는 대화가 없습니다.' : '채널명 또는 회원명으로 검색하거나, 전체 로그를 조회하세요.'}
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
