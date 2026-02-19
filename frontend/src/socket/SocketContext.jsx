import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from './socket';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { addNotification, incrementUnreadCount, removeNotification, notifications } = useNotificationStore();
    const [onlineCount, setOnlineCount] = useState(0);

    // 알림음 재생 함수
    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('[SOUND] Audio play blocked by browser policy:', e));
        } catch (error) {
            console.error('[SOUND] Audio play error:', error);
        }
    };

    useEffect(() => {
        if (user) {
            socket.connect();
            socket.emit('setup', user);

            socket.on('connected', () => console.log('[SOCKET] Connected'));

            // 전역 알림 리스너
            socket.on('notice_received', (notice) => {
                console.log('[SOCKET] Notice received:', notice);
                addNotification({
                    id: Date.now() + Math.random(),
                    type: 'notice',
                    title: '새 공지사항',
                    message: notice.title,
                    channelId: notice.channelId,
                    path: `/notices?channelId=${notice.channelId}`
                });
                incrementUnreadCount(notice.channelId, 'notice');
                playNotificationSound();
            });

            socket.on('post_received', (post) => {
                console.log('[SOCKET] Post received:', post);
                addNotification({
                    id: Date.now() + Math.random(),
                    type: 'post',
                    title: '새 게시글',
                    message: post.title,
                    channelId: post.channelId,
                    path: `/board?channelId=${post.channelId}`
                });
                incrementUnreadCount(post.channelId, 'post');
                playNotificationSound();
            });

            socket.on('chat_notification', (data) => {
                console.log('[SOCKET] Chat notification received:', data);
                addNotification({
                    id: Date.now() + Math.random(),
                    type: 'chat',
                    title: '새 메시지',
                    message: `${data.senderName}: ${data.content}`,
                    channelId: data.channelId,
                    path: `/chat?channelId=${data.channelId}`
                });
                incrementUnreadCount(data.channelId, 'chat');
                playNotificationSound();
            });

            return () => {
                socket.off('notice_received');
                socket.off('post_received');
                socket.off('chat_notification');
                socket.disconnect();
            };
        }
    }, [user, addNotification, incrementUnreadCount]);

    useEffect(() => {
        if (currentChannel?._id && socket.connected) {
            socket.emit('join_channel', currentChannel._id);
            socket.on('channel_online_count', (count) => setOnlineCount(count));
            return () => {
                socket.emit('leave_channel', currentChannel._id);
                socket.off('channel_online_count');
            };
        } else {
            setOnlineCount(0);
        }
    }, [currentChannel, user]);

    const handleNotificationClick = (noti) => {
        removeNotification(noti.id);
        navigate(noti.path);
    };

    return (
        <SocketContext.Provider value={{ socket, onlineCount }}>
            {children}
            {/* 실시간 알림 팝업 UI */}
            <div className="fixed bottom-8 right-8 z-[100] space-y-4 pointer-events-none">
                {notifications.map((noti) => (
                    <div
                        key={noti.id}
                        onClick={() => handleNotificationClick(noti)}
                        className="pointer-events-auto bg-[#1a1a28]/95 backdrop-blur-xl border border-[rgba(79,110,247,0.3)] p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-10 duration-500 w-80 cursor-pointer hover:scale-105 hover:border-[#4f6ef7] transition-all group overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#4f6ef7] shadow-[0_0_15px_rgba(79,110,247,0.5)]"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#4f6ef7]/10 flex items-center justify-center text-2xl group-hover:bg-[#4f6ef7]/20 transition-colors">
                                {noti.type === 'notice' ? '📢' : noti.type === 'post' ? '📋' : '💬'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[10px] font-bold text-[#4f6ef7] uppercase tracking-[0.2em] font-mono mb-1">
                                    {noti.title}
                                </h4>
                                <p className="text-xs text-[#e8e8f0] font-bold truncate">
                                    {noti.message}
                                </p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeNotification(noti.id); }}
                                className="text-[#444466] hover:text-white transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </SocketContext.Provider>
    );
};
