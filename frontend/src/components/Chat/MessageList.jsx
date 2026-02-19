import { useEffect, useRef } from 'react';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';

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

                    return (
                        <div
                            key={msg._id}
                            className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500`}
                        >
                            {!isMe && (
                                <div className={`w-9 h-9 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[11px] font-black text-[#6b6b8a] flex-shrink-0 mb-1 ${!showAvatar && 'invisible'}`}>
                                    {user?.role === 'admin' ? currentRoom.memberId?.name?.[0] : currentRoom.adminId?.name?.[0]}
                                </div>
                            )}
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                {!isMe && showAvatar && (
                                    <span className="text-[10px] font-black text-[#5a5a6a] mb-2 ml-1 uppercase tracking-widest font-mono italic leading-none">
                                        {user?.role === 'admin' ? currentRoom.memberId?.name : currentRoom.adminId?.name}
                                    </span>
                                )}
                                <div className={`relative px-6 py-4 rounded-[2rem] text-[13px] leading-relaxed shadow-xl transition-all hover:scale-[1.01] ${isMe
                                    ? 'bg-[#FF9500] text-white rounded-tr-none shadow-[#FF9500]/10'
                                    : 'bg-[#2a2a3a] text-[#e8e8f0] border border-white/5 rounded-tl-none shadow-black/20'
                                    }`}>
                                    {msg.content}
                                </div>
                                {showTime && (
                                    <span className={`text-[8px] font-bold font-mono mt-2 text-[#3a3a4a] uppercase tracking-tighter italic ${isMe ? 'text-right mr-2' : 'ml-2'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
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
