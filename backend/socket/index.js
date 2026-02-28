const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { writeChatLog, writeAuthLog } = require('../utils/logService');
const { sendPushNotification, sendPushToChannelMembers } = require('../utils/pushService');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('?Œì¼“ ?°ê²°??', socket.id);

        // ?¬ìš©??ê°œë³„ ë£?ì°¸ê? (?Œë¦¼??
        socket.on('setup', async (userData) => {
            if (userData?._id) {
                const userIdStr = userData._id.toString();
                socket.join(userIdStr);
                socket.userId = userIdStr;
                socket.sessionId = userData.sessionId;



                // ?°ì´?°ë² ?´ìŠ¤???¸ì…˜ ID?€ ë¹„êµ?˜ì—¬ ì¤‘ë³µ ë¡œê·¸??ì²´í¬
                try {
                    const latestUser = await User.findById(userData._id);
                    if (latestUser && latestUser.currentSessionId && latestUser.currentSessionId !== userData.sessionId) {

                        socket.emit('force_logout', { message: '?¤ë¥¸ ê¸°ê¸°?ì„œ ë¡œê·¸?¸ì´ ê°ì??˜ì–´ ?ë™ ë¡œê·¸?„ì›ƒ?©ë‹ˆ??' });
                    } else {
                        socket.emit('connected');
                    }
                } catch (error) {
                    console.error('[SOCKET] setup ?¸ì…˜ ì²´í¬ ?ëŸ¬:', error);
                    socket.emit('connected');
                }
            }
        });

        // ì±„íŒ…ë°??…ìž¥???„í•œ ?„ìš© ?¸ë“¤??(?„ë½ë¶?ì¶”ê?)
        socket.on('join_room', (roomId) => {
            if (roomId) {
                socket.join(roomId);

            }
        });

        // ?½ìŒ ì²˜ë¦¬: ì±„íŒ…ë°??…ìž¥ ???ë?ë°?ë©”ì‹œì§€ë¥?isRead: trueë¡??…ë°?´íŠ¸
        socket.on('mark_read', async ({ roomId, userId }) => {
            if (!roomId || !userId) return;
            try {
                // ?´ê? ë°›ì? ë©”ì‹œì§€(?ë?ë°©ì´ ë³´ë‚¸ ê²?ë¥??½ìŒ ì²˜ë¦¬
                const result = await Message.updateMany(
                    { roomId, senderId: { $ne: userId }, isRead: false },
                    { $set: { isRead: true } }
                );

                if (result.modifiedCount > 0) {
                    // ë°œì‹ ?ë“¤?ê²Œ ?½ìŒ ?Œë¦¼ - ë°??„ì²´??emit (ë°œì‹ ???ì‹  ?¬í•¨)
                    io.to(roomId).emit('messages_read', { roomId, readerId: userId });

                }
            } catch (error) {
                console.error('[SOCKET] mark_read ?ëŸ¬:', error);
            }
        });

        // ì±„ë„ ë£?ì°¸ê? ë°??¸ì› ì§‘ê³„
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

        // ?ˆë¡œ??ê³µì??¬í•­ ?ì„± ?Œë¦¼
        socket.on('new_notice', async (data) => {
            const { channelId, notice } = data;
            socket.to(`channel_${channelId}`).emit('notice_received', notice);

            // ê³µì??¬í•­ ???¸ì‹œ ë°œì†¡
            await sendPushToChannelMembers(channelId, socket.userId, {
                title: `?“¢ ??ê³µì??¬í•­: ${notice.title}`,
                body: 'ì±„ë„???ˆë¡œ??ê³µì??¬í•­???±ë¡?˜ì—ˆ?µë‹ˆ??',
                url: `/notices?channelId=${channelId}`,
                tag: 'notice'
            });
        });

        // ë©”ì‹œì§€ ?„ì†¡ (?Œì¼ ê¸°ë¡ ì¶”ê?)
        socket.on('send_message', async (data) => {
            const { roomId, senderId, content, channelId, fileUrl, fileType, fileName } = data;


            try {
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
                    const logContent = fileUrl ? `[${fileName || (fileType?.startsWith('image/') ? '?¬ì§„' : '?Œì¼')}] ${content || ''}` : content;
                    writeChatLog(roomId, user.name, logContent);
                }

                const room = await ChatRoom.findById(roomId);
                if (room) {
                    const isAdminSender = room.adminId.toString() === senderId.toString();
                    const recipientId = isAdminSender ? room.memberId : room.adminId;

                    // ?˜ì‹ ?ê? ?„ìž¬ ë°©ì— ?‘ì† ì¤‘ì¸ì§€ ?•ì¸ (?‘ì† ì¤‘ì´ë©?unreadCount ì¦ê? ????
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


                    // ê°€?œì„± ë³´ìž¥ ë°?ë§ˆì?ë§?ë©”ì‹œì§€ ?ìŠ¤??ê²°ì •
                    let lastMsgText = content;
                    if (fileUrl) {
                        const typeLabel = fileType?.startsWith('image/') ? '?¬ì§„' : '?Œì¼';
                        lastMsgText = content ? `[${typeLabel}] ${content}` : `[${typeLabel}] ${fileName || ''}`;
                    }

                    const updateData = {
                        lastMessage: lastMsgText,
                        lastMessageAt: Date.now(),
                        adminVisible: true,
                        memberVisible: true
                    };

                    if (!isRecipientInRoom) {
                        // ?˜ì‹ ?ê? ë°©ì— ?†ì„ ?Œë§Œ unreadCount ì¦ê?
                        if (isAdminSender) {
                            updateData.$inc = { unreadCountMember: 1 };
                        } else {
                            updateData.$inc = { unreadCountAdmin: 1 };
                        }
                    } else {
                        // ?˜ì‹ ?ê? ë°©ì— ?ˆìœ¼ë©?isRead: trueë¡?ë©”ì‹œì§€ ì¦‰ì‹œ ?€??
                        await Message.findByIdAndUpdate(message._id, { isRead: true });
                    }

                    const updatedRoom = await ChatRoom.findByIdAndUpdate(roomId, updateData, { new: true })
                        .populate('adminId', 'name username isOnline')
                        .populate('memberId', 'name username isOnline');


                    io.to(roomId).emit('receive_message', message);

                    // ì±„íŒ…ë°?ëª©ë¡ ?…ë°?´íŠ¸ ?•ë³´ ?„ì†¡ (?•ë ¬ ë°?ì¹´ìš´??ë°˜ì˜???„í•¨)
                    io.to(room.adminId.toString()).emit('room_updated', updatedRoom);
                    io.to(room.memberId.toString()).emit('room_updated', updatedRoom);

                    const recipientRoom = recipientId.toString();


                    io.to(recipientRoom).emit('chat_notification', {
                        roomId,
                        senderName: user?.name,
                        content: lastMsgText.substring(0, 20),
                        channelId: channelId || room.channelId
                    });

                    // ???¸ì‹œ ë°œì†¡ (ë°±ê·¸?¼ìš´???Œë¦¼?? - pushService ?¬ìš©
                    await sendPushNotification(recipientId, {
                        title: `${user?.name}?˜ì˜ ?ˆë¡œ??ë©”ì‹œì§€ ?‘`,
                        body: lastMsgText.length > 50 ? lastMsgText.substring(0, 50) + '...' : lastMsgText,
                        url: `/chat?channelId=${channelId || room.channelId}&roomId=${roomId}`,
                        tag: `chat-${roomId}`
                    });
                }
            } catch (error) {
                console.error('[SOCKET] ë©”ì‹œì§€ ?„ì†¡ ?ëŸ¬:', error);
            }
        });

        // ?°ê²° ?´ì œ ??ëª¨ë“  ì°¸ê? ì¤‘ì¸ ì±„ë„???¸ì› ???…ë°?´íŠ¸ ?„ìš”
        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room.startsWith('channel_')) {
                    const channelId = room.split('_')[1];
                    // ì§€???¤í–‰ (?¬íŠ¸?´ë¦¬???±ì—??ë¸Œë¼?°ì? ê°±ì‹  ???ˆì •???•ë³´)
                    setTimeout(() => {
                        const clientCount = io.sockets.adapter.rooms.get(room)?.size || 0;
                        io.to(room).emit('channel_online_count', clientCount);
                    }, 100);
                }
            }
        });

        // ?€?´í•‘ ?íƒœ
        socket.on('typing', (room) => socket.in(room).emit('typing'));
        socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing'));

        // ?°ê²° ?´ì œ ???¨ë¼???íƒœ ë°?ë¡œê·¸?„ì›ƒ ?œê°„ ?…ë°?´íŠ¸
        socket.on('disconnect_user', async (userId) => {
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.isOnline = false;
                    user.lastLogoutAt = Date.now();
                    await user.save();
                    writeAuthLog(`ë¡œê·¸?„ì›ƒ: ${user.username}`);
                    console.log('?¬ìš©???¤í”„?¼ì¸ ì²˜ë¦¬ ë°?ë¡œê·¸ ê¸°ë¡:', user.username);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('?Œì¼“ ?°ê²° ?´ì œ??);
        });
    });
};

module.exports = socketHandler;
