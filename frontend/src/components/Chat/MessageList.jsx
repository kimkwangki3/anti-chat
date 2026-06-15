import { useEffect, useRef } from 'react';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import { getFileUrl, normalizeDisplayFileName } from '../../utils/fileUtils';
import UserAvatar from '../Common/UserAvatar';

const MessageList = () => {
    const { messages, currentRoom } = useChatStore();
    const { user } = useAuthStore();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!currentRoom) return null;

    // 내가 보낸 메시지 중 isRead: true인 마지막 인덱스
    const lastReadIndex = (() => {
        const myMessages = messages
            .map((msg, index) => ({ msg, index }))
            .filter(({ msg }) => msg.senderId === user?._id || msg.senderId?._id === user?._id);

        for (let i = myMessages.length - 1; i >= 0; i--) {
            if (myMessages[i].msg.isRead) return myMessages[i].index;
        }
        return -1;
    })();

    // 내가 보낸 메시지 중 가장 마지막 인덱스
    const lastSentIndex = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.senderId === user?._id || msg.senderId?._id === user?._id) return i;
        }
        return -1;
    })();

    return (
        <div className="space-y-10 pb-10">
            {messages.length === 0 ? (
                <div className="py-24 text-center opacity-10 select-none">
                    <p className="text-[10px] font-black tracking-[0.4em] uppercase font-mono">No Message History</p>
                </div>
            ) : (
                messages.map((msg, index) => {
                    const isMe = msg.senderId === user?._id || msg.senderId?._id === user?._id;
                    const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                    const showTime = index === messages.length - 1 || messages[index + 1].senderId !== msg.senderId;
                    const showReadReceipt = isMe && index === lastSentIndex;
                    const isRead = isMe && index <= lastReadIndex;

                    const iAmAdmin = user?._id === currentRoom.adminId?._id || user?._id === currentRoom.adminId;
                    const otherIsAdmin = !iAmAdmin;

                    // 채널 정보 (관리자 아바타용)
                    const channelImage = currentRoom.channelId?.profileImage;
                    const channelColor = currentRoom.channelId?.cardColor || '#FF8C69';
                    const channelName = currentRoom.channelId?.name || '';

                    // 상대방 표시 이름 (채널관리자는 항상 '관리자'로 통일)
                    const otherName = iAmAdmin ? currentRoom.memberId?.name : '관리자';

                    return (
                        <div
                            key={msg._id}
                            className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500`}
                        >
                            {/* 상대방 아바타 */}
                            {!isMe && (
                                <div className={`flex-shrink-0 mb-1 ${!showAvatar && 'invisible'}`}>
                                    {otherIsAdmin ? (
                                        /* 상대방이 관리자인 경우 → 채널 로고 */
                                        <div className="w-9 h-9 rounded-2xl overflow-hidden flex items-center justify-center"
                                            style={{ backgroundColor: `${channelColor}30` }}>
                                            {channelImage ? (
                                                <img src={channelImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-black" style={{ color: channelColor }}>
                                                    {channelName?.[0] || '#'}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        /* 상대방이 멤버인 경우 → 프로필 사진 */
                                        <UserAvatar
                                            profileImage={currentRoom.memberId?.profileImage}
                                            name={currentRoom.memberId?.name}
                                            size="w-9 h-9"
                                            radiusClass="rounded-2xl"
                                        />
                                    )}
                                </div>
                            )}
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                {!isMe && showAvatar && (
                                    <span className="text-[9px] font-black text-[#5a5a6a] mb-1.5 ml-1 uppercase tracking-widest font-mono italic leading-none">
                                        {otherName}
                                    </span>
                                )}

                                <div className={`relative rounded-2xl md:rounded-[2rem] text-xs md:text-[13px] leading-relaxed shadow-xl transition-all overflow-hidden ${isMe
                                    ? 'bg-[#FF8C69] text-white rounded-tr-none shadow-[#FF8C69]/10'
                                    : 'bg-[#2a2a3a] text-[#e8e8f0] border border-white/5 rounded-tl-none shadow-black/20'
                                    }`}>
                                    {msg.fileUrl && (
                                        <div className="mb-2">
                                            {msg.fileType?.startsWith('image/') ? (
                                                <div className="group/img relative">
                                                    <img
                                                        src={getFileUrl(msg.fileUrl)}
                                                        alt={normalizeDisplayFileName(msg.fileName)}
                                                        className="max-w-full max-h-[300px] object-cover rounded-xl md:rounded-[1.5rem] cursor-pointer hover:scale-[1.02] transition-transform"
                                                        onClick={() => window.open(getFileUrl(msg.fileUrl), '_blank')}
                                                    />
                                                </div>
                                            ) : (
                                                <a
                                                    href={getFileUrl(msg.fileUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-black/20 border-white/5 hover:bg-black/30'} transition-all`}
                                                >
                                                    <span className="text-2xl">📄</span>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold truncate">{normalizeDisplayFileName(msg.fileName || '다운로드')}</span>
                                                        <span className={`text-[9px] font-mono ${isMe ? 'text-white/50' : 'text-[#444466]'}`}>파일 다운로드</span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {msg.content && (
                                        <div className="px-4 py-3 md:px-6 md:py-4">
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                                <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    {showTime && (
                                        <span className={`text-[7px] md:text-[8px] font-bold font-mono text-[#3a3a4a] uppercase tracking-tighter italic ${isMe ? 'mr-1' : 'ml-1'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {/* 읽음 표시 */}
                                    {showReadReceipt && (
                                        <span className={`text-[9px] font-bold font-mono tracking-tighter mr-1 transition-all ${isRead ? 'text-[#FF8C69]' : 'text-[#3a3a4a]'}`}>
                                            {isRead ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
