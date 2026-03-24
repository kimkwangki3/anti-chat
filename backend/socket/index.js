const { queryOne, execute, insertAndGetId, getChannelPool, queryOneInPool, executeInPool, queryInPool } = require('../db/mssql');
const { writeChatLog, writeAuthLog } = require('../utils/logService');
const { sendPushNotification, sendPushToChannelMembers } = require('../utils/pushService');
const { populateRoomById, formatRoom: _formatRoom, getChannelDbName } = require('../utils/chatUtils');

const populateRoom = populateRoomById;
const formatRoom = _formatRoom;

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('소켓 연결됨:', socket.id);

        socket.on('setup', async (userData) => {
            if (userData?._id) {
                const userIdStr = userData._id.toString();
                socket.join(userIdStr);
                socket.userId = userIdStr;
                socket.sessionId = userData.sessionId;
                socket.userChannels = userData.channels || [];

                // 슈퍼어드민만 마스터 DB 세션 체크
                if (userData.isMaster) {
                    try {
                        const latestUser = await queryOne('SELECT id, name, currentSessionId FROM Users WHERE id=@id', { id: userData._id });
                        if (latestUser && latestUser.currentSessionId && latestUser.currentSessionId !== userData.sessionId) {
                            console.log(`[SOCKET] Session mismatch for ${userData.name}. Enforcing logout.`);
                            socket.emit('force_logout', { message: '다른 기기에서 로그인이 감지되어 자동 로그아웃됩니다.' });
                            return;
                        }
                    } catch (error) {
                        console.error('[SOCKET] setup 세션 체크 에러:', error);
                    }
                }
                socket.emit('connected');
            }
        });

        socket.on('join_room', (roomId) => {
            if (roomId) socket.join(roomId);
        });

        socket.on('mark_read', async ({ roomId, userId }) => {
            if (!roomId || !userId) return;
            try {
                const result = await execute(
                    'UPDATE Messages SET isRead=1 WHERE roomId=@roomId AND senderId != @userId AND isRead=0',
                    { roomId, userId }
                );
                if (result.rowsAffected && result.rowsAffected[0] > 0) {
                    io.to(roomId).emit('messages_read', { roomId, readerId: userId });
                    console.log(`[SOCKET] Marked ${result.rowsAffected[0]} messages as read in room: ${roomId}`);
                }
            } catch (error) {
                console.error('[SOCKET] mark_read 에러:', error);
            }
        });

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

        socket.on('new_notice', async (data) => {
            const { channelId, notice } = data;
            socket.to(`channel_${channelId}`).emit('notice_received', notice);

            await sendPushToChannelMembers(channelId, socket.userId, {
                title: `📢 새 공지사항: ${notice.title}`,
                body: '채널에 새로운 공지사항이 등록되었습니다.',
                url: `/notices?channelId=${channelId}`,
                tag: 'notice'
            });
        });

        socket.on('send_message', async (data) => {
            const { roomId, senderId, content, channelId, fileUrl, fileType, fileName } = data;
            try {
                const room = await queryOne('SELECT * FROM ChatRooms WHERE id=@id', { id: roomId });
                if (!room) return;

                const targetChannelId = channelId || room.channelId;
                const chatMemberId = room.memberId;

                const channel = await queryOne('SELECT name FROM Channels WHERE id=@id', { id: targetChannelId });
                const isSuperAdminDirectRoom = channel?.name === '__SUPERADMIN_DM__';

                if (!isSuperAdminDirectRoom) {
                    const dbName = await getChannelDbName(targetChannelId);
                    if (dbName) {
                        const pool = await getChannelPool(dbName);
                        const memberUser = await queryOneInPool(pool, 'SELECT status FROM Users WHERE id=@id', { id: chatMemberId });
                        if (memberUser && memberUser.status === 'suspended') {
                            socket.emit('chat_error', { message: '해당 회원은 현재 휴정 상태이므로 메시지를 주고받을 수 없습니다.' });
                            return;
                        }
                    }
                }

                const messageId = await insertAndGetId(
                    'INSERT INTO Messages (roomId, senderId, content, fileUrl, fileType, fileName) VALUES (@roomId, @senderId, @content, @fileUrl, @fileType, @fileName)',
                    { roomId, senderId, content: content || null, fileUrl: fileUrl || null, fileType: fileType || null, fileName: fileName || null }
                );
                const message = await queryOne('SELECT * FROM Messages WHERE id=@id', { id: messageId });

                let user = null;
                const senderDbName = await getChannelDbName(targetChannelId);
                if (senderDbName) {
                    const senderPool = await getChannelPool(senderDbName);
                    user = await queryOneInPool(senderPool, 'SELECT id, name, username FROM Users WHERE id=@id', { id: senderId });
                }
                if (!user) {
                    user = await queryOne('SELECT id, name, username FROM Users WHERE id=@id', { id: senderId });
                }

                if (user) {
                    const logContent = fileUrl ? `[${fileName || (fileType?.startsWith('image/') ? '사진' : '파일')}] ${content || ''}` : content;
                    writeChatLog(roomId, user.name, logContent);
                }

                const isAdminSender = String(room.adminId) === String(senderId);
                const recipientId = isAdminSender ? room.memberId : room.adminId;

                const roomOccupants = io.sockets.adapter.rooms.get(roomId);
                let isRecipientInRoom = false;
                if (roomOccupants) {
                    for (const socketId of roomOccupants) {
                        const s = io.sockets.sockets.get(socketId);
                        if (s && s.rooms.has(String(recipientId))) {
                            isRecipientInRoom = true;
                            break;
                        }
                    }
                }

                let lastMsgText = content || '';
                if (fileUrl) {
                    const typeLabel = fileType?.startsWith('image/') ? '사진' : '파일';
                    lastMsgText = content ? `[${typeLabel}] ${content}` : `[${typeLabel}] ${fileName || ''}`;
                }

                const now = new Date();
                if (isRecipientInRoom) {
                    await execute('UPDATE Messages SET isRead=1 WHERE id=@id', { id: message.id });
                    await execute(
                        'UPDATE ChatRooms SET lastMessage=@lastMessage, lastMessageAt=@now, adminVisible=1, memberVisible=1, updatedAt=GETDATE() WHERE id=@id',
                        { lastMessage: lastMsgText, now, id: roomId }
                    );
                } else {
                    const incField = isAdminSender ? 'unreadCountMember = unreadCountMember + 1' : 'unreadCountAdmin = unreadCountAdmin + 1';
                    await execute(
                        `UPDATE ChatRooms SET lastMessage=@lastMessage, lastMessageAt=@now, adminVisible=1, memberVisible=1, ${incField}, updatedAt=GETDATE() WHERE id=@id`,
                        { lastMessage: lastMsgText, now, id: roomId }
                    );
                }

                const populated = await populateRoom(roomId);
                const updatedRoom = formatRoom(populated);

                io.to(roomId).emit('receive_message', message);
                io.to(String(room.adminId)).emit('room_updated', updatedRoom);
                io.to(String(room.memberId)).emit('room_updated', updatedRoom);
                io.to(String(recipientId)).emit('chat_notification', {
                    roomId,
                    senderName: user?.name,
                    content: lastMsgText.substring(0, 20),
                    channelId: targetChannelId
                });

                await sendPushNotification(recipientId, {
                    title: `${user?.name}님의 새로운 메시지 🍑`,
                    body: lastMsgText.length > 50 ? lastMsgText.substring(0, 50) + '...' : lastMsgText,
                    url: `/chat?channelId=${targetChannelId}&roomId=${roomId}`,
                    tag: `chat-${roomId}`
                });
            } catch (error) {
                console.error('[SOCKET] 메시지 전송 에러:', error);
            }
        });

        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room.startsWith('channel_')) {
                    setTimeout(() => {
                        const clientCount = io.sockets.adapter.rooms.get(room)?.size || 0;
                        io.to(room).emit('channel_online_count', clientCount);
                    }, 100);
                }
            }
        });

        socket.on('typing', (room) => socket.in(room).emit('typing'));
        socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing'));

        socket.on('set_idle', async () => {
            if (!socket.userChannels?.length) return;
            try {
                for (const ch of socket.userChannels) {
                    const pool = await getChannelPool(ch.dbName);
                    await executeInPool(pool, "UPDATE Users SET presenceStatus='idle' WHERE id=@id", { id: ch.userId });
                    io.to(`channel_${ch.channelId}`).emit('presence_update', { userId: ch.userId, status: 'idle' });
                }
            } catch (error) {
                console.error('[SOCKET] set_idle 에러:', error);
            }
        });

        socket.on('set_online', async () => {
            if (!socket.userChannels?.length) return;
            try {
                for (const ch of socket.userChannels) {
                    const pool = await getChannelPool(ch.dbName);
                    await executeInPool(pool, "UPDATE Users SET presenceStatus='online' WHERE id=@id", { id: ch.userId });
                    io.to(`channel_${ch.channelId}`).emit('presence_update', { userId: ch.userId, status: 'online' });
                }
            } catch (error) {
                console.error('[SOCKET] set_online 에러:', error);
            }
        });

        socket.on('disconnect_user', async (userId) => {
            if (userId) {
                try {
                    const user = await queryOne('SELECT id, username FROM Users WHERE id=@id', { id: userId });
                    if (user) {
                        await execute('UPDATE Users SET isOnline=0, lastLogoutAt=GETDATE() WHERE id=@id', { id: userId });
                        writeAuthLog(`로그아웃: ${user.username}`);
                    }
                    if (socket.userChannels?.length) {
                        for (const ch of socket.userChannels) {
                            const pool = await getChannelPool(ch.dbName);
                            await executeInPool(pool,
                                "UPDATE Users SET isOnline=0, presenceStatus='offline', lastLogoutAt=GETDATE() WHERE id=@id",
                                { id: ch.userId }
                            );
                            await executeInPool(pool,
                                'UPDATE LoginHistory SET logoutAt=GETDATE() WHERE userId=@userId AND logoutAt IS NULL',
                                { userId: ch.userId }
                            );
                            io.to(`channel_${ch.channelId}`).emit('presence_update', { userId: ch.userId, status: 'offline' });
                        }
                    }
                } catch (error) {
                    console.error('[SOCKET] disconnect_user 에러:', error);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('소켓 연결 해제됨');
        });
    });
};

module.exports = socketHandler;
