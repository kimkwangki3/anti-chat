const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { writeChatLog, writeAuthLog } = require('../utils/logService');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('소켓 연결됨:', socket.id);

        // 사용자 개별 룸 참가 (알림용)
        socket.on('setup', (userData) => {
            if (userData?._id) {
                socket.join(userData._id.toString());
                console.log(`[SOCKET] ${userData.name} joined private room: ${userData._id}`);
                socket.emit('connected');
            }
        });

        // 채널 룸 참가 및 인원 집계
        socket.on('join_channel', (channelId) => {
            if (channelId) {
                socket.join(`channel_${channelId}`);
                console.log(`[SOCKET] Joined channel: ${channelId}`);

                const clientCount = io.sockets.adapter.rooms.get(`channel_${channelId}`)?.size || 0;
                io.to(`channel_${channelId}`).emit('channel_online_count', clientCount);
            }
        });

        socket.on('leave_channel', (channelId) => {
            socket.leave(`channel_${channelId}`);
            const clientCount = io.sockets.adapter.rooms.get(`channel_${channelId}`)?.size || 0;
            io.to(`channel_${channelId}`).emit('channel_online_count', clientCount);
        });

        // 새로운 공지사항 생성 알림
        socket.on('new_notice', (data) => {
            const { channelId, notice } = data;
            socket.to(`channel_${channelId}`).emit('notice_received', notice);
        });

        // 메시지 전송 (파일 기록 추가)
        socket.on('send_message', async (data) => {
            const { roomId, senderId, content, channelId } = data; // channelId 추가

            try {
                const message = await Message.create({
                    roomId,
                    senderId,
                    content
                });

                const user = await User.findById(senderId);
                if (user) {
                    writeChatLog(roomId, user.name, content);
                }

                await ChatRoom.findByIdAndUpdate(roomId, {
                    lastMessage: content,
                    lastMessageAt: Date.now()
                });

                io.to(roomId).emit('receive_message', message);

                // 채팅 타겟 알림 (수신자에게만 전송)
                const room = await ChatRoom.findById(roomId);
                if (room) {
                    const recipientId = room.adminId.toString() === senderId.toString() ? room.memberId : room.adminId;
                    const recipientRoom = recipientId.toString();

                    console.log(`[SOCKET] Sending notification to user room: ${recipientRoom}`);

                    io.to(recipientRoom).emit('chat_notification', {
                        roomId,
                        senderName: user?.name,
                        content: content.substring(0, 20),
                        channelId
                    });
                }
            } catch (error) {
                console.error('[SOCKET] 메시지 전송 에러:', error);
            }
        });

        // 연결 해제 시 모든 참가 중인 채널의 인원 수 업데이트 필요
        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room.startsWith('channel_')) {
                    const channelId = room.split('_')[1];
                    // 지연 실행 (포트폴리오 등에서 브라우저 갱신 시 안정성 확보)
                    setTimeout(() => {
                        const clientCount = io.sockets.adapter.rooms.get(room)?.size || 0;
                        io.to(room).emit('channel_online_count', clientCount);
                    }, 100);
                }
            }
        });

        // 타이핑 상태
        socket.on('typing', (room) => socket.in(room).emit('typing'));
        socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing'));

        // 연결 해제 시 온라인 상태 및 로그아웃 시간 업데이트
        socket.on('disconnect_user', async (userId) => {
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.isOnline = false;
                    user.lastLogoutAt = Date.now();
                    await user.save();
                    writeAuthLog(`로그아웃: ${user.username}`);
                    console.log('사용자 오프라인 처리 및 로그 기록:', user.username);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('소켓 연결 해제됨');
        });
    });
};

module.exports = socketHandler;
