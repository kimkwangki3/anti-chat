const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const slugifyChannelName = (value) => {
    return String(value || '')
        .trim().toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 60);
};

const buildUniqueChannelSlug = async (name, excludeChannelId = null) => {
    const baseSlug = slugifyChannelName(name) || `channel-${Date.now()}`;
    let candidate = baseSlug;
    let suffix = 1;
    while (true) {
        const existing = excludeChannelId
            ? await queryOne('SELECT id FROM Channels WHERE slug = @slug AND id != @excludeId', { slug: candidate, excludeId: excludeChannelId })
            : await queryOne('SELECT id FROM Channels WHERE slug = @slug', { slug: candidate });
        if (!existing) return candidate;
        suffix++;
        candidate = `${baseSlug}-${suffix}`;
    }
};

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const getChannelImageExtension = (file) => {
    const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
    return extByMime[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
};

const saveChannelImageLocally = async (req, file) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'channels');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const ext = getChannelImageExtension(file);
    const fileName = `channel_${req.user.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    await fs.promises.writeFile(path.join(uploadDir, fileName), file.buffer);
    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/channels/${fileName}`;
};

// POST /api/channels
router.post('/', protect, admin, async (req, res) => {
    const { name, description, slug } = req.body;
    try {
        const countRow = await queryOne('SELECT COUNT(*) as cnt FROM Channels WHERE ownerId = @ownerId', { ownerId: req.user.id });
        if (countRow.cnt >= 4) return res.status(400).json({ message: '관리자는 최대 4개의 채널까지 개설할 수 있습니다.' });

        const existing = await queryOne('SELECT id FROM Channels WHERE name = @name', { name });
        if (existing) return res.status(400).json({ message: '이미 존재하는 채널 이름입니다.' });

        const channelSlug = await buildUniqueChannelSlug(slug || name);
        const channelId = await insertAndGetId(
            'INSERT INTO Channels (ownerId, name, description, slug) VALUES (@ownerId, @name, @description, @slug)',
            { ownerId: req.user.id, name, description, slug: channelSlug }
        );

        await execute(
            'INSERT INTO ChannelMembers (channelId, userId, status) VALUES (@channelId, @userId, \'approved\')',
            { channelId, userId: req.user.id }
        );

        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        return res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channels/search
router.get('/search', protect, async (req, res) => {
    const { q } = req.query;
    try {
        const channels = await query(
            `SELECT c.*, u.name as ownerName, u.username as ownerUsername
             FROM Channels c JOIN Users u ON c.ownerId = u.id
             WHERE c.name LIKE @q AND c.status = 'active'`,
            { q: `%${q || ''}%` }
        );
        res.json(channels.map(c => ({
            ...c,
            ownerId: { _id: c.ownerId, id: c.ownerId, name: c.ownerName, username: c.ownerUsername }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channels/my-channels
router.get('/my-channels', protect, async (req, res) => {
    try {
        const memberships = await query(
            `SELECT cm.*, c.id as c_id, c.name as c_name, c.slug, c.description, c.profileImage,
                    c.status as c_status, c.cardColor, c.ownerId,
                    u.id as owner_id, u.name as owner_name, u.username as owner_username, u.isOnline as owner_isOnline
             FROM ChannelMembers cm
             JOIN Channels c ON cm.channelId = c.id
             JOIN Users u ON c.ownerId = u.id
             WHERE cm.userId = @userId AND cm.status = 'approved' AND c.status = 'active'`,
            { userId: req.user.id }
        );
        res.json(memberships.map(m => ({
            _id: m.id, id: m.id,
            channelId: {
                _id: m.c_id, id: m.c_id, name: m.c_name, slug: m.slug,
                description: m.description, profileImage: m.profileImage,
                status: m.c_status, cardColor: m.cardColor, ownerId: m.ownerId,
                owner: { _id: m.owner_id, name: m.owner_name, username: m.owner_username, isOnline: m.owner_isOnline }
            },
            status: m.status, isChatBlocked: m.isChatBlocked
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channels/unread-counts
router.get('/unread-counts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('[Unread API] Starting query for user:', userId);

        const memberships = await query(
            `SELECT cm.channelId FROM ChannelMembers cm
             JOIN Channels c ON cm.channelId = c.id
             WHERE cm.userId = @userId AND cm.status = 'approved' AND c.status = 'active'`,
            { userId }
        );
        console.log('[Unread API] Fetched memberships:', memberships.length);

        const counts = {};
        const channelIds = memberships.map(m => m.channelId);
        console.log(`[Unread API] User ${userId} active channels: ${channelIds.length}`);

        for (const channelId of channelIds) {
            try {
                const noticeRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Notices n WHERE n.channelId = @channelId
                     AND NOT EXISTS (SELECT 1 FROM NoticeReadBy WHERE noticeId = n.id AND userId = @userId)`,
                    { channelId, userId }
                );
                const postRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Posts p WHERE p.channelId = @channelId
                     AND NOT EXISTS (SELECT 1 FROM PostReadBy WHERE postId = p.id AND userId = @userId)`,
                    { channelId, userId }
                );
                const pollRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Polls p WHERE p.channelId = @channelId
                     AND p.status = 'active' AND p.expiresAt > GETDATE()
                     AND NOT EXISTS (SELECT 1 FROM PollReadBy WHERE pollId = p.id AND userId = @userId)`,
                    { channelId, userId }
                );
                const chatRow = await queryOne(
                    `SELECT ISNULL(SUM(CASE WHEN adminId = @userId THEN unreadCountAdmin ELSE unreadCountMember END), 0) as cnt
                     FROM ChatRooms WHERE channelId = @channelId AND (adminId = @userId OR memberId = @userId)`,
                    { channelId, userId }
                );

                counts[String(channelId)] = {
                    notice: noticeRow.cnt, post: postRow.cnt,
                    poll: pollRow.cnt, chat: chatRow.cnt
                };
                console.log(`[Unread API] Channel ${channelId}: notice=${noticeRow.cnt}, post=${postRow.cnt}, poll=${pollRow.cnt}, chat=${chatRow.cnt}`);
            } catch (err) {
                console.error(`[Unread API] Error processing channel ${channelId}:`, err.message);
            }
        }

        res.json(counts);
    } catch (error) {
        console.error('Unread counts fetch error:', error);
        res.status(500).json({ message: '알림 정보를 불러오는데 실패했습니다.' });
    }
});

// GET /api/channels/slug/:slug
router.get('/slug/:slug', protect, async (req, res) => {
    try {
        const channel = await queryOne(
            `SELECT c.*, u.name as ownerName, u.username as ownerUsername
             FROM Channels c JOIN Users u ON c.ownerId = u.id WHERE c.slug = @slug`,
            { slug: req.params.slug }
        );
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (channel.status === 'suspended' && req.user.role !== 'superadmin' && channel.ownerId !== req.user.id) {
            return res.status(403).json({ message: '이 채널은 현재 정지된 상태입니다.' });
        }
        res.json({ ...channel, ownerId: { _id: channel.ownerId, id: channel.ownerId, name: channel.ownerName, username: channel.ownerUsername } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channels/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const channel = await queryOne(
            `SELECT c.*, u.name as ownerName, u.username as ownerUsername
             FROM Channels c JOIN Users u ON c.ownerId = u.id WHERE c.id = @id`,
            { id: req.params.id }
        );
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (channel.status === 'suspended' && req.user.role !== 'superadmin' && channel.ownerId !== req.user.id) {
            return res.status(403).json({ message: '이 채널은 현재 정지된 상태입니다.' });
        }
        res.json({ ...channel, ownerId: { _id: channel.ownerId, id: channel.ownerId, name: channel.ownerName, username: channel.ownerUsername } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/channels/:id
router.put('/:id', protect, async (req, res) => {
    const { name, description, profileImage, cardColor, slug } = req.body;
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (channel.ownerId !== req.user.id) return res.status(401).json({ message: '채널 정보를 수정할 권한이 없습니다.' });

        const newSlug = await buildUniqueChannelSlug(slug || name || channel.name, channel.id);
        await execute(
            `UPDATE Channels SET name=@name, description=@description, profileImage=@profileImage,
             cardColor=@cardColor, slug=@slug, updatedAt=GETDATE() WHERE id=@id`,
            {
                name: name || channel.name,
                description: description || channel.description,
                profileImage: profileImage !== undefined ? profileImage : channel.profileImage,
                cardColor: cardColor || channel.cardColor,
                slug: newSlug,
                id: channel.id
            }
        );
        const updated = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channel.id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/channels/upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        const localUrl = await saveChannelImageLocally(req, req.file);
        return res.json({ imageUrl: localUrl });
    } catch (error) {
        console.error('[Channel Upload] Global exception:', error);
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.', detail: error.message });
    }
});

module.exports = router;
