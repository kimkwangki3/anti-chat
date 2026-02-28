const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const ChannelMember = require('../models/ChannelMember');
const { writeChatLog, writeAuthLog } = require('../utils/logService');
const { sendPushNotification, sendPushToChannelMembers } = require('../utils/pushService');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('소켓 연결됨:', socket.id);

        // 사용자 개별 룸 참가 (알림용)
        socket.on('setup', async (userData) => {
            if (userData?._id) {
                const userIdStr = userData._id.toString();
                socket.join(userIdStr);
                socket.userId = userIdStr;
                socket.sessionId = userData.sessionId;



                // 데이터베이스의 세션 ID와 비교하여 중복 로그인 체크
                try {
                    const latestUser = await User.findById(userData._id);
                    if (latestUser && latestUser.currentSessionId && latestUser.currentSessionId !== userData.sessionId) {
                        console.log(`[SOCKET] Session mismatch for ${userData.name}. Enforcing logout.`);
                        socket.emit('force_logout', { message: '다른 기기에서 로그인이 감지되어 자동 로그아웃됩니다.' });
                    } else {
                        socket.emit('connected');
                    }
                } catch (error) {
                    console.error('[SOCKET] setup 세션 체크 에러:', error);
                    socket.emit('connected');
                }
            }
        });

        // 채팅방 입장을 위한 전용 핸들러 (누락분 추가)
        socket.on('join_room', (roomId) => {
            if (roomId) {
                socket.join(roomId);

            }
        });

        // 읽음 처리: 채팅방 입장 시 상대방 메시지를 isRead: true로 업데이트
        socket.on('mark_read', async ({ roomId, userId }) => {
            if (!roomId || !userId) return;
            try {
                // 내가 받은 메시지(상대방이 보낸 것)를 읽음 처리
                const result = await Message.updateMany(
                    { roomId, senderId: { $ne: userId }, isRead: false },
                    { $set: { isRead: true } }
                );

                if (result.modifiedCount > 0) {
                    // 발신자들에게 읽음 알림 - 방 전체에 emit (발신자 자신 포함)
                    io.to(roomId).emit('messages_read', { roomId, readerId: userId });
                    console.log(`[SOCKET] Marked ${result.modifiedCount} messages as read in room: ${roomId}`);
                }
            } catch (error) {
                console.error('[SOCKET] mark_read 에러:', error);
            }
        });

        // 채널 룸 참가 및 인원 집계
        socket.on('join_channel', (channelId) => {
            if (channelId) {
                socket.join(`channel_${channelId}`);


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
        socket.on('new_notice', async (data) => {
            const { channelId, notice } = data;
            socket.to(`channel_${channelId}`).emit('notice_received', notice);

            // 공지사항 웹 푸시 발송
            await sendPushToChannelMembers(channelId, socket.userId, {
                title: `📢 새 공지사항: ${notice.title}`,
                body: '채널에 새로운 공지사항이 등록되었습니다.',
                url: `/notices?channelId=${channelId}`,
                tag: 'notice'
            });
        });

        // 메시지 전송 (파일 기록 추가)
        socket.on('send_message', async (data) => {
            const { roomId, senderId, content, channelId, fileUrl, fileType, fileName } = data;

            try {
                // 발신자 및 방 정보 먼저 조회
                const room = await ChatRoom.findById(roomId);
                if (!room) return;

                // 해당 멤버의 채널 상태 검사 (휴정 여부)
                const targetChannelId = channelId || room.channelId;
                // 채팅방의 멤버 ID (사용자 ID)
                const chatMemberId = room.memberId;

                const channelMember = await ChannelMember.findOne({
                    channelId: targetChannelId,
                    userId: chatMemberId
                });

                // 멤버가 아예 없거나 휴정 상태이면 전송 차단
                if (!channelMember || channelMember.status === 'suspended') {
                    socket.emit('chat_error', {
                        message: '해당 회원은 현재 휴정 상태이므로 메시지를 주고받을 수 없습니다.'
                    });
                    return; // DB 저장 및 전송 로직 중단
                }

                const message = await Message.create({
                    roomId,
                    senderId,
                    content,
                    fileUrl,
                    fileType,
                    fileName
                });

                const user = await User.findById(senderId);

                if (user) {
                    const logContent = fileUrl ? `[${fileName || (fileType?.startsWith('image/') ? '사진' : '파일')}] ${content || ''}` : content;
                    writeChatLog(roomId, user.name, logContent);
                }

                if (room) {
                    const isAdminSender = room.adminId.toString() === senderId.toString();
                    const recipientId = isAdminSender ? room.memberId : room.adminId;

                    // 수신자가 현재 방에 접속 중인지 확인 (접속 중이면 unreadCount 증가 안 함)
                    const roomOccupants = io.sockets.adapter.rooms.get(roomId);
                    const recipientSocketsInRoom = [];
                    if (roomOccupants) {
                        for (const socketId of roomOccupants) {
                            const s = io.sockets.sockets.get(socketId);
                            if (s && s.rooms.has(recipientId.toString())) {
                                recipientSocketsInRoom.push(socketId);
                            }
                        }
                    }
                    const isRecipientInRoom = recipientSocketsInRoom.length > 0;


                    // 가시성 보장 및 마지막 메시지 텍스트 결정
                    let lastMsgText = content;
                    if (fileUrl) {
                        const typeLabel = fileType?.startsWith('image/') ? '사진' : '파일';
                        lastMsgText = content ? `[${typeLabel}] ${content}` : `[${typeLabel}] ${fileName || ''}`;
                    }

                    const updateData = {
                        lastMessage: lastMsgText,
                        lastMessageAt: Date.now(),
                        adminVisible: true,
                        memberVisible: true
                    };

                    if (!isRecipientInRoom) {
                        // 수신자가 방에 없을 때만 unreadCount 증가
                        if (isAdminSender) {
                            updateData.$inc = { unreadCountMember: 1 };
                        } else {
                            updateData.$inc = { unreadCountAdmin: 1 };
                        }
                    } else {
                        // 수신자가 방에 있으면 isRead: true로 메시지 즉시 저장
                        await Message.findByIdAndUpdate(message._id, { isRead: true });
                    }

                    const updatedRoom = await ChatRoom.findByIdAndUpdate(roomId, updateData, { new: true })
                        .populate('adminId', 'name username isOnline')
                        .populate('memberId', 'name username isOnline');


                    io.to(roomId).emit('receive_message', message);

                    // 채팅방 목록 업데이트 정보 전송 (정렬 및 카운트 반영을 위함)
                    io.to(room.adminId.toString()).emit('room_updated', updatedRoom);
                    io.to(room.memberId.toString()).emit('room_updated', updatedRoom);

                    const recipientRoom = recipientId.toString();


                    io.to(recipientRoom).emit('chat_notification', {
                        roomId,
                        senderName: user?.name,
                        content: lastMsgText.substring(0, 20),
                        channelId: channelId || room.channelId
                    });

                    // 웹 푸시 발송 (백그라운드 알림용) - pushService 사용
                    await sendPushNotification(recipientId, {
                        title: `${user?.name}님의 새로운 메시지 🍑`,
                        body: lastMsgText.length > 50 ? lastMsgText.substring(0, 50) + '...' : lastMsgText,
                        url: `/chat?channelId=${channelId || room.channelId}&roomId=${roomId}`,
                        tag: `chat-${roomId}`
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
