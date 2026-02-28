import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();
    const { user, token, sessionId: storeSessionId } = useAuthStore();
    const { myChannels, fetchMyChannels, currentChannel } = useChannelStore();
    const { addNotification, incrementUnreadCount, removeNotification, notifications, incrementPendingCount, fetchUnreadCounts } = useNotificationStore();
    const { soundType, volume, sounds } = useSettingsStore();
    const { markMessagesRead } = useChatStore();
    const [onlineCount, setOnlineCount] = useState(0);

    // [고도화] 리스너 호출 시 최신 상태 참조를 위한 Ref 사용
    const locationRef = useRef(location);
    const channelRef = useRef(currentChannel);
    const userRef = useRef(user); // userRef 추가

    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => { channelRef.current = currentChannel; }, [currentChannel]);
    useEffect(() => { userRef.current = user; }, [user]); // userRef 업데이트

    // [고도화] 알림 억제 여부 판단 함수 (Ref 사용으로 안정화)
    const shouldSuppressNotification = (targetType, targetChannelId, targetRoomId) => {
        const params = new URLSearchParams(locationRef.current.search);
        const currentChannelId = params.get('channelId');
        const currentRoomId = params.get('roomId');
        const pathname = locationRef.current.pathname;

        // 공지사항, 게시판 등은 무조건 알림이 오도록 수정 (사용자 요청)
        /*
        // 1. 공지사항: 해당 채널의 공지사항 페이지에 있는 경우
        if (targetType === 'notice' && pathname === '/notices' && currentChannelId === targetChannelId) {
            return true;
        }
        // 2. 게시판: 해당 채널의 게시판 페이지에 있는 경우
        if (targetType === 'post' && pathname === '/board' && currentChannelId === targetChannelId) {
            return true;
        }
        */

        // 3. 채팅: 해당 채널의 특정 채팅방에 있는 경우에만 억제 (중복 방지)
        if (targetType === 'chat' && pathname === '/chat' && currentChannelId === targetChannelId && currentRoomId === targetRoomId) {
            return true;
        }

        return false;
    };

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

    // 푸시 알림 구독 함수 (항상 재구독 - VAPID 키 변경 이후 일관성 보장)
    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.log('[PUSH] Push not supported in this browser');
                return;
            }

            // 1. 알림 권한 먼저 요청 (iOS PWA에서 명시적 권한 요청이 필요)
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        console.log('[PUSH] Notification permission denied');
                        return;
                    }
                } else if (Notification.permission === 'denied') {
                    console.log('[PUSH] Notification permission was denied by user');
                    return;
                }
            } else {
                console.log('[PUSH] Notification API not available');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // 2. 서버에서 VAPID 공개키 가져오기
            const { data } = await axios.get('/push/vapid-key');
            const publicKey = data.publicKey;
            if (!publicKey) return;

            // 3. 브라우저에 저장된 기존 구독 삭제 (키 변경으로 인한 불일치 방지)
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                await existingSubscription.unsubscribe();
                console.log('[PUSH] Old browser subscription cleared');
            }

            // 4. 서버 DB의 구독 정보도 삭제 (불일치 방지)
            try {
                await axios.delete('/push/subscribe');
                console.log('[PUSH] Old server subscription cleared');
            } catch (e) {
                console.warn('[PUSH] Server subscription cleanup failed (non-fatal):', e.message);
            }

            // 5. 새 구독 등록
            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // 6. 서버에 새 구독 정보 전송
            await axios.post('/push/subscribe', { subscription: newSubscription });
            console.log('[PUSH] New subscription registered successfully');
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

    // 1. 소켓 연결 및 기본 설정 (user 변경 시에만 실행)
    useEffect(() => {
        if (!user) {
            if (socket.connected) socket.disconnect();
            return;
        }

        // 연결 시도
        if (!socket.connected) {
            const sid = storeSessionId || useAuthStore.getState().sessionId;
            socket.auth = { token };
            socket.connect();
            socket.emit('setup', { ...user, sessionId: sid });

            // 연결 시 푸시 구독 시도
            subscribeToPush();
        }

        socket.on('connected', () => console.log('[SOCKET] Connected'));

        // 중복 로그인 감지 (강제 로그아웃)
        socket.on('force_logout', (data) => {
            console.log('[SOCKET] Force logout event received:', data);
            alert(data.message || '다른 기기에서 로그인이 감지되어 자동 로그아웃됩니다.');
            const { logout } = useAuthStore.getState();
            logout();
            navigate('/login');
        });

        return () => {
            socket.off('connected');
            socket.off('force_logout');
            // 여기서 disconnect를 바로 부르면 소극적 flapping이 생길 수 있으나, 
            // user가 완전히 null이 된 경우에만 처리하도록 위에서 분기함.
        };
    }, [user?._id, token, navigate]); // token 추가하여 인증 정보 변경 시 재연결 보장

    // 2. 알림 및 전역 이벤트 리스너 (한 번만 등록)
    useEffect(() => {
        if (!user) return;

        console.log('[SOCKET] Registering global listeners');

        const onNotice = (notice) => {
            const channelId = notice.channelId?._id || notice.channelId;
            if (!shouldSuppressNotification('notice', channelId)) {
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'notice',
                    title: '새 공지사항',
                    message: notice.title,
                    channelId,
                    path: `/notices?channelId=${channelId}`
                });
                playNotificationSound();
            }
            incrementUnreadCount(channelId, 'notice');
        };

        const onPost = (post) => {
            const channelId = post.channelId?._id || post.channelId;
            if (!shouldSuppressNotification('post', channelId)) {
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'post',
                    title: '새 게시글',
                    message: post.title,
                    channelId,
                    path: `/board?channelId=${channelId}`
                });
                playNotificationSound();
            }
            incrementUnreadCount(channelId, 'post');
        };

        const onChat = (data) => {
            const channelId = data.channelId?._id || data.channelId;
            const roomId = data.roomId;
            if (!shouldSuppressNotification('chat', channelId, roomId)) {
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'chat',
                    title: '새 메시지',
                    message: `${data.senderName}: ${data.content}`,
                    channelId,
                    path: `/chat?channelId=${channelId}&roomId=${roomId}`
                });
                playNotificationSound();
            }
            incrementUnreadCount(channelId, 'chat');
        };

        const onMessagesRead = ({ roomId, readerId }) => {
            markMessagesRead(roomId, readerId);
        };

        const onMessagesCleared = ({ roomId, updatedRoom }) => {
            const { currentRoom, updateRoomInList } = useChatStore.getState();
            if (currentRoom?._id === roomId) {
                useChatStore.setState({ messages: [] });
            }
            updateRoomInList(updatedRoom);
        };

        const onNewMemberRequest = (data) => {
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
        };

        const onMemberStatusUpdated = (data) => {
            const { fetchMyChannels } = useChannelStore.getState();
            if (data.status === 'approved') {
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'member',
                    title: '✅ 채널 가입 승인',
                    message: `${data.channelName} 채널 가입이 승인되었습니다!`,
                    channelId: data.channelId,
                    path: '/'
                });
            } else if (data.status === 'rejected') {
                addNotificationWithTimer({
                    id: Date.now() + Math.random(),
                    type: 'member',
                    title: '❌ 채널 가입 거절',
                    message: `${data.channelName} 채널 가입이 거절되었습니다.`,
                    channelId: data.channelId,
                    path: '/search-channels'
                });
            }
            fetchMyChannels();
            playNotificationSound();
        };

        const onNewPollCreated = (data) => {
            addNotificationWithTimer({
                id: Date.now() + Math.random(),
                type: 'poll',
                title: '새 투표 개최 🗳️',
                message: data.title,
                channelId: data.channelId,
                path: `/polls?channelId=${data.channelId}`
            });
            incrementUnreadCount(data.channelId, 'notice'); // 공지에 포함하여 카운트
            playNotificationSound();
        };

        const onPollReminder = (data) => {
            addNotificationWithTimer({
                id: Date.now() + Math.random(),
                type: 'poll',
                title: data.title,
                message: data.message,
                channelId: data.channelId,
                path: `/polls?channelId=${data.channelId}`
            });
            playNotificationSound();
        };

        socket.on('notice_received', onNotice);
        socket.on('post_received', onPost);
        socket.on('chat_notification', onChat);
        socket.on('messages_read', onMessagesRead);
        socket.on('messages_cleared', onMessagesCleared);
        socket.on('new_member_request', onNewMemberRequest);
        socket.on('member_status_updated', onMemberStatusUpdated);
        socket.on('new_poll_created', onNewPollCreated);
        socket.on('poll_reminder', onPollReminder);

        return () => {
            socket.off('notice_received', onNotice);
            socket.off('post_received', onPost);
            socket.off('chat_notification', onChat);
            socket.off('messages_read', onMessagesRead);
            socket.off('messages_cleared', onMessagesCleared);
            socket.off('new_member_request', onNewMemberRequest);
            socket.off('member_status_updated', onMemberStatusUpdated);
            socket.off('new_poll_created', onNewPollCreated);
            socket.off('poll_reminder', onPollReminder);
        };
    }, [user?._id]); // user 정보가 바뀌어 로그아웃/로그인 될 때만 리스너 재설정

    useEffect(() => {
        if (socket.connected && user?._id) {
            // 1. 기본 유저 방 조인 및 세션 설정
            socket.emit('setup', { ...user, sessionId: localStorage.getItem('sessionId') });

            // 2. 가입된 모든 채널 방 조인 (글로벌 알림용)
            if (myChannels.length > 0) {
                myChannels.forEach(membership => {
                    if (membership.channelId?._id) {
                        socket.emit('join_channel', membership.channelId._id);
                    }
                });
            }

            // 3. 초기 읽지 않은 개수 서버와 동기화
            fetchUnreadCounts();
        }
    }, [socket.connected, user?._id, myChannels, fetchUnreadCounts]);

    useEffect(() => {
        if (currentChannel?._id && socket.connected) {
            socket.emit('join_channel', currentChannel._id);
            socket.on('channel_online_count', (count) => setOnlineCount(count));
            return () => {
                // 채널을 완전히 떠나지는 않음 (글로벌 알림 수신 유지)
                // 다만 온라인 카운트 리스너만 제거
                socket.off('channel_online_count');
            };
        } else {
            setOnlineCount(0);
        }
    }, [currentChannel, socket.connected]);

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
                                {noti.type === 'notice' ? '📢' : noti.type === 'post' ? '📋' : noti.type === 'poll' ? '🗳️' : noti.type === 'member' ? '👥' : '💬'}
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
