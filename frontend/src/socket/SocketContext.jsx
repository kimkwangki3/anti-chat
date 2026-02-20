import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from './socket';
import useAuthStore from '../store/authStore';
import useChannelStore from '../store/channelStore';
import useNotificationStore from '../store/notificationStore';
import useSettingsStore from '../store/settingsStore';
import useChatStore from '../store/chatStore';

import axios from '../api/axios';

const SocketContext = createContext();

// VAPID 키를 base64에서 Uint8Array로 변환
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { currentChannel } = useChannelStore();
    const { addNotification, incrementUnreadCount, removeNotification, notifications, incrementPendingCount } = useNotificationStore();
    const { soundType, volume, sounds } = useSettingsStore();
    const { markMessagesRead } = useChatStore();
    const [onlineCount, setOnlineCount] = useState(0);

    // 알림음 재생 함수
    const playNotificationSound = () => {
        try {
            const audio = new Audio(sounds[soundType]);
            audio.volume = volume;
            audio.play().catch(e => console.log('[SOUND] Audio play blocked:', e));
        } catch (error) {
            console.error('[SOUND] Audio play error:', error);
        }
    };

    // 푸시 알림 구독 함수
    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.log('[PUSH] Push not supported');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // 1. 서버에서 공개키 가져오기
            const { data } = await axios.get('/push/vapid-key');
            const publicKey = data.publicKey;

            if (!publicKey) return;

            // 2. 브라우저 푸시 구독
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // 3. 서버에 구독 정보 전송
            await axios.post('/push/subscribe', { subscription });
            console.log('[PUSH] Subscription successful');
        } catch (error) {
            console.error('[PUSH] Subscription failed:', error);
        }
    };

    // 알림 추가 + 5초 후 자동 삭제
    const addNotificationWithTimer = (notification) => {
        addNotification(notification);
        setTimeout(() => {
            removeNotification(notification.id);
        }, 5000);
    };

    useEffect(() => {
        if (user) {
            socket.connect();
            socket.emit('setup', user);

            // 로그인 시 푸시 알림 구독 시도
            subscribeToPush();

            socket.on('connected', () => console.log('[SOCKET] Connected'));

            // 전역 알림 리스너
            socket.on('notice_received', (notice) => {
                const channelId = notice.channelId?._id || notice.channelId;
                console.log('[SOCKET] Notice received:', notice);
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'notice',
                    title: '새 공지사항',
                    message: notice.title,
                    channelId,
                    path: `/notices?channelId=${channelId}`
                });
                incrementUnreadCount(channelId, 'notice');
                playNotificationSound();
            });

            socket.on('post_received', (post) => {
                const channelId = post.channelId?._id || post.channelId;
                console.log('[SOCKET] Post received:', post);
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'post',
                    title: '새 게시글',
                    message: post.title,
                    channelId,
                    path: `/board?channelId=${channelId}`
                });
                incrementUnreadCount(channelId, 'post');
                playNotificationSound();
            });

            socket.on('chat_notification', (data) => {
                const channelId = data.channelId?._id || data.channelId;
                console.log('[SOCKET] Chat notification received:', data);
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'chat',
                    title: '새 메시지',
                    message: `${data.senderName}: ${data.content}`,
                    channelId,
                    path: `/chat?channelId=${channelId}&roomId=${data.roomId}`
                });
                incrementUnreadCount(channelId, 'chat');
                playNotificationSound();
            });

            // 읽음 처리 이벤트
            socket.on('messages_read', ({ roomId, readerId }) => {
                markMessagesRead(roomId, readerId);
            });

            // 신규 가입 신청 (관리자만 수신)
            socket.on('new_member_request', (data) => {
                console.log('[SOCKET] New member request:', data);
                incrementPendingCount(data.channelId);
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'member',
                    title: '새 가입 신청',
                    message: `${data.userName}님이 ${data.channelName} 채널에 가입 신청했습니다.`,
                    channelId: data.channelId,
                    path: `/admin/members?channelId=${data.channelId}`
                });
                playNotificationSound();
            });

            return () => {
                socket.off('notice_received');
                socket.off('post_received');
                socket.off('chat_notification');
                socket.off('messages_read');
                socket.off('new_member_request');
                socket.disconnect();
            };
        }
    }, [user, addNotification, incrementUnreadCount, markMessagesRead, incrementPendingCount]);

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
            {/* 실시간 알림 팝업 UI - 우측 상단 */}
            <div className="fixed top-20 right-4 z-[100] space-y-3 pointer-events-none">
                {notifications.map((noti) => (
                    <div
                        key={noti.id}
                        onClick={() => handleNotificationClick(noti)}
                        className="pointer-events-auto bg-[#1a1a28]/95 backdrop-blur-xl border border-[rgba(79,110,247,0.3)] p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-5 duration-500 w-80 cursor-pointer hover:scale-105 hover:border-[#4f6ef7] transition-all group overflow-hidden"
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
                                className="text-[#444466] hover:text-white transition-colors flex-shrink-0"
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
