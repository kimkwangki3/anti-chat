const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { normalizeUploadedFileName } = require('../utils/filename');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const SUPERADMIN_DM_CHANNEL_NAME = '__SUPERADMIN_DM__';

const getChatThreshold = () => {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setHours(5, 0, 0, 0);
    if (now < threshold) threshold.setDate(threshold.getDate() - 1);
    return threshold;
};

const ensureSuperAdminDmChannel = async (ownerId) => {
    let channel = await queryOne('SELECT * FROM Channels WHERE name = @name', { name: SUPERADMIN_DM_CHANNEL_NAME });
    if (!channel) {
        const id = await insertAndGetId(
            `INSERT INTO Channels (ownerId, name, description, cardColor, status)
             VALUES (@ownerId, @name, 'Superadmin direct message channel', '#FF8C69', 'active')`,
            { ownerId, name: SUPERADMIN_DM_CHANNEL_NAME }
        );
        channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id });
    }
    return channel;
};

const populateRoom = async (roomId) => {
    return queryOne(
        `SELECT r.*,
            a.id as admin_id, a.name as admin_name, a.username as admin_username, a.isOnline as admin_isOnline, a.profileImage as admin_profileImage, a.role as admin_role,
            m.id as member_id, m.name as member_name, m.username as member_username, m.isOnline as member_isOnline, m.profileImage as member_profileImage, m.role as member_role, m.status as member_status,
            c.name as channel_name, c.profileImage as channel_profileImage, c.cardColor as channel_cardColor
         FROM ChatRooms r
         JOIN Users a ON r.adminId = a.id
         JOIN Users m ON r.memberId = m.id
         JOIN Channels c ON r.channelId = c.id
         WHERE r.id = @id`,
        { id: roomId }
    );
};

const formatRoom = (r) => ({
    ...r,
    adminId: { _id: r.admin_id, id: r.admin_id, name: r.admin_name, username: r.admin_username, isOnline: r.admin_isOnline, profileImage: r.admin_profileImage, role: r.admin_role },
    memberId: { _id: r.member_id, id: r.member_id, name: r.member_name, username: r.member_username, isOnline: r.member_isOnline, profileImage: r.member_profileImage, role: r.member_role, status: r.member_status },
    channelId: { _id: r.channelId, id: r.channelId, name: r.channel_name, profileImage: r.channel_profileImage, cardColor: r.channel_cardColor }
});

// GET /api/chat/users/:channelId
router.get('/users/:channelId', protect, admin, async (req, res) => {
    try {
        const members = await query(
            `SELECT u.id, u.name, u.username, u.isOnline, u.profileImage
             FROM ChannelMembers cm JOIN Users u ON cm.userId = u.id
             WHERE cm.channelId = @channelId AND cm.status = 'approved'`,
            { channelId: req.params.channelId }
        );
        res.json(members.map(u => ({ ...u, _id: u.id })));
    } catch (error) {
        res.status(500).json({ message: '멤버 목록을 불러오는데 실패했습니다.' });
    }
});

// POST /api/chat/rooms/superadmin
router.post('/rooms/superadmin', protect, async (req, res) => {
    const { memberId } = req.body;
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ message: '최고관리자만 사용할 수 있습니다.' });
        if (!memberId) return res.status(400).json({ message: '대화할 사용자 ID가 필요합니다.' });
        if (String(memberId) === String(req.user.id)) return res.status(400).json({ message: '자기 자신과는 대화할 수 없습니다.' });

        const targetUser = await queryOne('SELECT id FROM Users WHERE id = @id', { id: memberId });
        if (!targetUser) return res.status(404).json({ message: '대상 사용자를 찾을 수 없습니다.' });

        const dmChannel = await ensureSuperAdminDmChannel(req.user.id);

        let room = await queryOne(
            'SELECT * FROM ChatRooms WHERE adminId = @adminId AND memberId = @memberId AND channelId = @channelId',
            { adminId: req.user.id, memberId, channelId: dmChannel.id }
        );

        const wasCreatedNow = !room;
        if (!room) {
            const roomId = await insertAndGetId(
                'INSERT INTO ChatRooms (channelId, adminId, memberId) VALUES (@channelId, @adminId, @memberId)',
                { channelId: dmChannel.id, adminId: req.user.id, memberId }
            );
            room = { id: roomId };
        } else {
            await execute('UPDATE ChatRooms SET adminVisible=1, memberVisible=1, updatedAt=GETDATE() WHERE id=@id', { id: room.id });
        }

        const populated = await populateRoom(room.id);
        const formatted = formatRoom(populated);

        if (wasCreatedNow) {
            const io = req.app.get('io');
            if (io) {
                io.to(String(req.user.id)).emit('room_updated', formatted);
                io.to(String(memberId)).emit('room_updated', formatted);
                io.to(String(memberId)).emit('chat_notification', {
                    roomId: room.id,
                    senderName: req.user.name || req.user.username || '최고관리자',
                    content: '최고관리자가 1:1 대화를 시작했습니다.',
                    channelId: dmChannel.id
                });
            }
        }

        res.status(200).json(formatted);
    } catch (error) {
        console.error('Superadmin room create error:', error);
        res.status(500).json({ message: `최고관리자 채팅방 생성에 실패했습니다. (${error.message})` });
    }
});

// POST /api/chat/rooms
router.post('/rooms', protect, async (req, res) => {
    const { memberId: requestedMemberId, channelId } = req.body;
    try {
        if (!channelId) return res.status(400).json({ message: '채널 ID가 필요합니다.' });

        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        let adminId, memberId;
        if (req.user.role === 'admin') {
            if (channel.ownerId !== req.user.id) return res.status(403).json({ message: '채널 관리자만 멤버에게 채팅을 시작할 수 있습니다.' });
            adminId = req.user.id;
            memberId = requestedMemberId;
        } else {
            const membership = await queryOne('SELECT id FROM ChannelMembers WHERE channelId=@channelId AND userId=@userId AND status=\'approved\'', { channelId, userId: req.user.id });
            if (!membership) return res.status(403).json({ message: '해당 채널의 승인된 멤버만 관리자에게 채팅할 수 있습니다.' });
            adminId = channel.ownerId;
            memberId = req.user.id;
        }

        let room = await queryOne('SELECT * FROM ChatRooms WHERE adminId=@adminId AND memberId=@memberId AND channelId=@channelId', { adminId, memberId, channelId });
        if (room) {
            await execute('UPDATE ChatRooms SET adminVisible=1, memberVisible=1, updatedAt=GETDATE() WHERE id=@id', { id: room.id });
            const populated = await populateRoom(room.id);
            return res.status(200).json(formatRoom(populated));
        }

        const roomId = await insertAndGetId(
            'INSERT INTO ChatRooms (channelId, adminId, memberId) VALUES (@channelId, @adminId, @memberId)',
            { channelId, adminId, memberId }
        );
        const populated = await populateRoom(roomId);
        res.status(201).json(formatRoom(populated));
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        res.status(500).json({ message: '채팅방 생성에 실패했습니다: ' + error.message });
    }
});

// GET /api/chat/rooms
router.get('/rooms', protect, async (req, res) => {
    const { channelId } = req.query;
    try {
        const isSuperAdmin = req.user.role === 'superadmin';
        const isAdmin = req.user.role === 'admin';
        const channelFilter = channelId ? 'AND r.channelId = @channelId' : '';
        const params = { userId: req.user.id };
        if (channelId) params.channelId = channelId;

        let whereClause;
        if (isSuperAdmin) {
            whereClause = `r.adminId = @userId AND r.adminVisible = 1 ${channelFilter}`;
        } else if (isAdmin) {
            const dmChannel = await queryOne('SELECT id FROM Channels WHERE name = @name', { name: SUPERADMIN_DM_CHANNEL_NAME });
            const dmChannelId = dmChannel?.id;
            if (channelId) {
                whereClause = `((r.adminId = @userId AND r.adminVisible = 1) OR (r.memberId = @userId AND r.memberVisible = 1)) ${channelFilter}`;
            } else {
                params.dmChannelId = dmChannelId || 0;
                whereClause = `(r.adminId = @userId AND r.adminVisible = 1) OR (r.memberId = @userId AND r.memberVisible = 1 AND r.channelId = @dmChannelId)`;
            }
        } else {
            whereClause = `r.memberId = @userId AND r.memberVisible = 1 ${channelFilter}`;
        }

        const rooms = await query(
            `SELECT r.*,
                a.id as admin_id, a.name as admin_name, a.username as admin_username, a.isOnline as admin_isOnline, a.profileImage as admin_profileImage, a.role as admin_role,
                m.id as member_id, m.name as member_name, m.username as member_username, m.isOnline as member_isOnline, m.profileImage as member_profileImage, m.role as member_role, m.status as member_status,
                c.name as channel_name, c.profileImage as channel_profileImage, c.cardColor as channel_cardColor
             FROM ChatRooms r
             JOIN Users a ON r.adminId = a.id
             JOIN Users m ON r.memberId = m.id
             JOIN Channels c ON r.channelId = c.id
             WHERE ${whereClause}
             ORDER BY r.lastMessageAt DESC`,
            params
        );

        const threshold = getChatThreshold();
        res.json(rooms.map(r => {
            const formatted = formatRoom(r);
            if (new Date(r.lastMessageAt) < threshold) formatted.lastMessage = '';
            return formatted;
        }));
    } catch (error) {
        res.status(500).json({ message: '채팅방 목록을 불러오는데 실패했습니다.' });
    }
});

// PUT /api/chat/rooms/:id/read
router.put('/rooms/:id/read', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const field = isAdmin ? 'unreadCountAdmin=0' : 'unreadCountMember=0';
        await execute(`UPDATE ChatRooms SET ${field}, updatedAt=GETDATE() WHERE id=@id`, { id: req.params.id });
        const room = await populateRoom(req.params.id);
        res.json(formatRoom(room));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/chat/rooms/:id/hide
router.put('/rooms/:id/hide', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const field = isAdmin ? 'adminVisible=0' : 'memberVisible=0';
        await execute(`UPDATE ChatRooms SET ${field}, updatedAt=GETDATE() WHERE id=@id`, { id: req.params.id });
        const room = await populateRoom(req.params.id);
        res.json(formatRoom(room));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/chat/rooms/:id/clear
router.put('/rooms/:id/clear', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const now = new Date();
        const clearFields = isAdmin
            ? 'lastMessage=\'\', lastMessageAt=@now, clearedAtAdmin=@now, clearedAtMember=@now'
            : 'lastMessage=\'\', lastMessageAt=@now, clearedAtMember=@now';
        await execute(`UPDATE ChatRooms SET ${clearFields}, updatedAt=GETDATE() WHERE id=@id`, { now, id: req.params.id });

        const room = await populateRoom(req.params.id);
        const formatted = formatRoom(room);

        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id).emit('messages_cleared', { roomId: req.params.id, clearedAt: now, updatedRoom: formatted });
        }
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', protect, async (req, res) => {
    try {
        const room = await queryOne('SELECT * FROM ChatRooms WHERE id = @id', { id: req.params.id });
        if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다.' });

        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const clearedAt = isAdmin ? room.clearedAtAdmin : room.clearedAtMember;
        const threshold = getChatThreshold();
        const effectiveThreshold = clearedAt && new Date(clearedAt) > threshold ? new Date(clearedAt) : threshold;

        const messages = await query(
            'SELECT * FROM Messages WHERE roomId = @roomId AND createdAt > @threshold ORDER BY createdAt ASC',
            { roomId: req.params.id, threshold: effectiveThreshold }
        );
        res.json(messages.map(m => ({ ...m, _id: m.id })));
    } catch (error) {
        res.status(500).json({ message: '메시지를 불러오는데 실패했습니다.' });
    }
});

// POST /api/chat/upload
router.post('/upload', protect, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'chat', resource_type: 'auto' },
            (error, result) => {
                if (error) return res.status(500).json({ message: 'Cloudinary 업로드 중 오류가 발생했습니다.' });
                res.json({
                    fileUrl: result.secure_url,
                    fileType: req.file.mimetype,
                    fileName: normalizeUploadedFileName(req.file.originalname || 'file'),
                    size: req.file.size
                });
            }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (error) {
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
