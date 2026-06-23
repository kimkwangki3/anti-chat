const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId, initChannelDb } = require('../db/mssql');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { syncChannelById } = require('../services/syncService');

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

// POST /api/channels  (채널 생성 = 슈퍼어드민 전용. ownerId로 채널관리자 배정 가능)
router.post('/', protect, superAdmin, async (req, res) => {
    const { name, description, slug, ownerId } = req.body;
    try {
        // 배정할 관리자(owner) 결정: ownerId가 오면 그 admin, 없으면 슈퍼어드민 본인
        let owner = req.user.id;
        if (ownerId) {
            const ownerUser = await queryOne('SELECT id, role FROM Users WHERE id = @id', { id: ownerId });
            if (!ownerUser || !['admin', 'superadmin'].includes(ownerUser.role)) {
                return res.status(400).json({ message: '배정할 관리자가 유효하지 않습니다.' });
            }
            owner = ownerUser.id;
        }

        const existing = await queryOne('SELECT id FROM Channels WHERE name = @name', { name });
        if (existing) return res.status(400).json({ message: '이미 존재하는 채널 이름입니다.' });

        const channelSlug = await buildUniqueChannelSlug(slug || name);

        // 채널 전용 DB 이름 생성 (영문/숫자 안전 형식)
        const dbName = 'ch_' + channelSlug.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 50) + '_' + Date.now().toString().slice(-6);

        const channelId = await insertAndGetId(
            'INSERT INTO Channels (ownerId, name, description, slug, databaseName) VALUES (@ownerId, @name, @description, @slug, @databaseName)',
            { ownerId: owner, name, description, slug: channelSlug, databaseName: dbName }
        );

        // 채널 전용 DB 생성 및 스키마 초기화
        await initChannelDb(dbName);

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

// GET /api/channels/login-info?slug=xxx 또는 ?host=xxx — 로그인 페이지 브랜딩 (공개, 인증 불필요)
router.get('/login-info', async (req, res) => {
    try {
        const { slug, host } = req.query;
        let channel = null;
        if (host) {
            channel = await queryOne(
                "SELECT id, name, slug, profileImage, cardColor, loginLogo, loginTitle FROM Channels WHERE loginDomain=@host AND status='active'",
                { host: String(host).trim().toLowerCase() }
            );
        }
        if (!channel && slug) {
            channel = await queryOne(
                "SELECT id, name, slug, profileImage, cardColor, loginLogo, loginTitle FROM Channels WHERE slug=@slug AND status='active'",
                { slug }
            );
        }
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        res.json({
            id: channel.id, _id: channel.id, name: channel.name, slug: channel.slug,
            loginLogo: channel.loginLogo || channel.profileImage || null,
            loginTitle: channel.loginTitle || null,
            cardColor: channel.cardColor || '#FF8C69'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/channels/:id/login-settings — 채널 로그인 페이지 설정 (관리자/소유자)
router.put('/:id/login-settings', protect, admin, async (req, res) => {
    const { loginTitle, loginDomain, cardColor } = req.body;
    try {
        const channel = await queryOne('SELECT id, ownerId FROM Channels WHERE id=@id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (!req.user.isMaster && channel.ownerId !== req.user.id) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }
        const updates = [], params = { id: channel.id };
        if (typeof loginTitle === 'string') { updates.push('loginTitle=@loginTitle'); params.loginTitle = loginTitle.trim().slice(0, 100); }
        if (typeof loginDomain === 'string') { updates.push('loginDomain=@loginDomain'); params.loginDomain = loginDomain.trim().toLowerCase().slice(0, 255) || null; }
        if (typeof cardColor === 'string') { updates.push('cardColor=@cardColor'); params.cardColor = cardColor.trim().slice(0, 20); }
        if (updates.length) await execute(`UPDATE Channels SET ${updates.join(',')}, updatedAt=GETDATE() WHERE id=@id`, params);
        const updated = await queryOne('SELECT id, name, slug, loginLogo, loginTitle, loginDomain, cardColor FROM Channels WHERE id=@id', { id: channel.id });
        res.json({ message: '로그인 페이지 설정이 저장되었습니다.', channel: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/channels/:id/login-logo — 로그인 아이콘 업로드 (관리자/소유자)
router.post('/:id/login-logo', protect, admin, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '이미지 파일이 없습니다.' });
        const channel = await queryOne('SELECT id, ownerId FROM Channels WHERE id=@id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (!req.user.isMaster && channel.ownerId !== req.user.id) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }
        let logoUrl = null;
        const hasCloud = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
        if (hasCloud) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'login_logos', transformation: [{ width: 400, height: 400, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }] },
                        (err, r) => r ? resolve(r) : reject(err)
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
                logoUrl = result.secure_url;
            } catch (e) { console.error('[login-logo] cloudinary 실패, 로컬 저장:', e.message); }
        }
        if (!logoUrl) logoUrl = await saveChannelImageLocally(req, req.file);
        await execute('UPDATE Channels SET loginLogo=@logo, updatedAt=GETDATE() WHERE id=@id', { logo: logoUrl, id: channel.id });
        res.json({ message: '아이콘이 업로드되었습니다.', loginLogo: logoUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/channels/:id/sync — 채널 회원 DB를 GTRADE에서 수동 전체 동기화 (관리자/소유자)
router.post('/:id/sync', protect, admin, async (req, res) => {
    try {
        const channel = await queryOne('SELECT id, ownerId FROM Channels WHERE id=@id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (!req.user.isMaster && channel.ownerId !== req.user.id) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }
        const result = await syncChannelById(req.params.id);
        res.json({ message: `동기화 완료 — 신규 ${result.inserted}명, 업데이트 ${result.updated}명 (총 ${result.total}건)`, ...result });
    } catch (error) {
        console.error('[ChannelSync] 오류:', error.message);
        res.status(500).json({ message: error.message || '동기화에 실패했습니다.' });
    }
});

// GET /api/channels/my-channels
router.get('/my-channels', protect, async (req, res) => {
    try {
        if (req.user.isMaster) {
            // 슈퍼어드민 — 전체 활성 채널 반환
            const channels = await query(
                `SELECT c.*, u.id as owner_id, u.name as owner_name, u.username as owner_username, u.isOnline as owner_isOnline
                 FROM Channels c JOIN Users u ON c.ownerId = u.id WHERE c.status = 'active'`
            );
            return res.json(channels.map(c => ({
                _id: c.id, id: c.id,
                channelId: {
                    _id: c.id, id: c.id, name: c.name, slug: c.slug,
                    description: c.description, profileImage: c.profileImage,
                    status: c.status, cardColor: c.cardColor,
                    ownerId: { _id: c.owner_id, id: c.owner_id, name: c.owner_name, username: c.owner_username, isOnline: c.owner_isOnline },
                    owner: { _id: c.owner_id, name: c.owner_name, username: c.owner_username, isOnline: c.owner_isOnline }
                },
                status: 'approved', isChatBlocked: 0
            })));
        }

        if (req.user.isAdminMaster) {
            // 채널관리자 — 본인이 owner인 채널만 반환 (A안: 다채널 관리)
            const channels = await query(
                `SELECT c.*, u.id as owner_id, u.name as owner_name, u.username as owner_username, u.isOnline as owner_isOnline
                 FROM Channels c JOIN Users u ON c.ownerId = u.id
                 WHERE c.ownerId = @ownerId AND c.status = 'active'`,
                { ownerId: req.user.id }
            );
            return res.json(channels.map(c => ({
                _id: c.id, id: c.id,
                channelId: {
                    _id: c.id, id: c.id, name: c.name, slug: c.slug,
                    description: c.description, profileImage: c.profileImage,
                    status: c.status, cardColor: c.cardColor,
                    ownerId: { _id: c.owner_id, id: c.owner_id, name: c.owner_name, username: c.owner_username, isOnline: c.owner_isOnline },
                    owner: { _id: c.owner_id, name: c.owner_name, username: c.owner_username, isOnline: c.owner_isOnline }
                },
                status: 'approved', isChatBlocked: 0, role: 'admin'
            })));
        }

        // 일반 유저 — JWT channels 배열로 해당 채널 상세정보 조회
        const userChannels = req.user.channels || [];
        if (!userChannels.length) return res.json([]);

        const channelIds = userChannels.map(c => c.channelId);
        const placeholders = channelIds.map((_, i) => `@id${i}`).join(',');
        const params = Object.fromEntries(channelIds.map((id, i) => [`id${i}`, id]));

        const channelRows = await query(
            `SELECT c.*, u.id as owner_id, u.name as owner_name, u.username as owner_username, u.isOnline as owner_isOnline
             FROM Channels c JOIN Users u ON c.ownerId = u.id
             WHERE c.id IN (${placeholders}) AND c.status = 'active'`,
            params
        );

        const channelMap = Object.fromEntries(channelRows.map(c => [c.id, c]));
        const result = userChannels
            .filter(uc => channelMap[uc.channelId])
            .map(uc => {
                const c = channelMap[uc.channelId];
                return {
                    _id: uc.channelId, id: uc.channelId,
                    channelId: {
                        _id: c.id, id: c.id, name: c.name, slug: c.slug,
                        description: c.description, profileImage: c.profileImage,
                        status: c.status, cardColor: c.cardColor, ownerId: c.ownerId,
                        owner: { _id: c.owner_id, name: c.owner_name, username: c.owner_username, isOnline: c.owner_isOnline }
                    },
                    status: 'approved', isChatBlocked: 0, role: uc.role
                };
            });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channels/unread-counts
router.get('/unread-counts', protect, async (req, res) => {
    try {
        const counts = {};

        // 채널별 userId 매핑 구성
        // 슈퍼어드민: 마스터 DB userId 사용
        // 채널 유저: JWT channels 배열에서 채널별 userId 사용
        let channelUserMap = {}; // { channelId: userId }

        if (req.user.isMaster) {
            const memberships = await query(
                `SELECT cm.channelId FROM ChannelMembers cm
                 JOIN Channels c ON cm.channelId = c.id
                 WHERE cm.userId = @userId AND cm.status = 'approved' AND c.status = 'active'`,
                { userId: req.user.id }
            );
            memberships.forEach(m => { channelUserMap[m.channelId] = req.user.id; });
        } else {
            const userChannels = req.user.channels || [];
            userChannels.forEach(c => { channelUserMap[c.channelId] = c.userId; });
        }

        for (const [channelId, userId] of Object.entries(channelUserMap)) {
            try {
                const cid = parseInt(channelId);
                const noticeRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Notices n WHERE n.channelId = @channelId
                     AND NOT EXISTS (SELECT 1 FROM NoticeReadBy WHERE noticeId = n.id AND userId = @userId)`,
                    { channelId: cid, userId }
                );
                const postRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Posts p WHERE p.channelId = @channelId
                     AND NOT EXISTS (SELECT 1 FROM PostReadBy WHERE postId = p.id AND userId = @userId)`,
                    { channelId: cid, userId }
                );
                const pollRow = await queryOne(
                    `SELECT COUNT(*) as cnt FROM Polls p WHERE p.channelId = @channelId
                     AND p.status = 'active' AND p.expiresAt > GETDATE()
                     AND NOT EXISTS (SELECT 1 FROM PollReadBy WHERE pollId = p.id AND userId = @userId)`,
                    { channelId: cid, userId }
                );
                const chatRow = await queryOne(
                    `SELECT ISNULL(SUM(CASE WHEN adminId = @userId THEN unreadCountAdmin ELSE unreadCountMember END), 0) as cnt
                     FROM ChatRooms WHERE channelId = @channelId AND (adminId = @userId OR memberId = @userId)`,
                    { channelId: cid, userId }
                );
                counts[channelId] = {
                    notice: noticeRow.cnt, post: postRow.cnt,
                    poll: pollRow.cnt, chat: chatRow.cnt
                };
            } catch (err) {
                console.error(`[Unread API] Channel ${channelId} 오류:`, err.message);
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
