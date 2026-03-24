const express = require('express');
const router = express.Router();
const { queryOne, getChannelPool, queryInPool, queryOneInPool, executeInPool, insertAndGetIdInPool } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// GET /api/channel-members/role/:channelId
// 현재 유저의 채널 내 역할 조회
router.get('/role/:channelId', protect, async (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId);

        if (req.user.isMaster) {
            const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
            if (!channel) return res.status(404).json({ message: '채널 없음' });
            return res.json({ role: channel.ownerId === req.user.id ? 'admin' : 'superadmin', isOwner: true });
        }

        const channelEntry = (req.user.channels || []).find(c => c.channelId === channelId);
        if (!channelEntry) return res.json({ role: 'none', status: 'none' });
        return res.json({ role: channelEntry.role, status: 'approved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channel-members/management/:channelId
// 채널 관리자 — 채널 DB의 전체 회원 목록
router.get('/management/:channelId', protect, admin, async (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId);
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        // 관리자 권한 확인 (슈퍼어드민 또는 해당 채널 admin)
        if (!req.user.isMaster) {
            const entry = (req.user.channels || []).find(c => c.channelId === channelId && c.role === 'admin');
            if (!entry) return res.status(403).json({ message: '해당 채널의 관리자가 아닙니다.' });
        }

        if (!channel.databaseName) {
            return res.json([]); // DB 아직 미생성
        }

        const pool = await getChannelPool(channel.databaseName);
        const members = await queryInPool(pool,
            'SELECT id, name, username, nickname, gender, birthdate, phone, recommender, registrationIp, role, isOnline, status, isChatBlocked, lastLoginAt, createdAt FROM Users ORDER BY createdAt DESC'
        );

        res.json(members.map(m => ({
            _id: m.id, id: m.id,
            channelId,
            status: m.status === 'approved' ? 'approved' : m.status,
            isChatBlocked: m.isChatBlocked,
            userId: { _id: m.id, id: m.id, name: m.name, username: m.username, nickname: m.nickname, gender: m.gender, birthdate: m.birthdate, phone: m.phone, recommender: m.recommender, registrationIp: m.registrationIp, isOnline: m.isOnline, role: m.role, status: m.status, lastLoginAt: m.lastLoginAt }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/channel-members/create
// 채널 관리자 — 채널 DB에 새 회원 직접 생성
router.post('/create', protect, admin, async (req, res) => {
    const { channelId, username, password, name, nickname, gender, birthdate, phone, recommender, role } = req.body;
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (!channel.databaseName) return res.status(400).json({ message: '채널 DB가 초기화되지 않았습니다.' });

        if (!req.user.isMaster) {
            const entry = (req.user.channels || []).find(c => c.channelId === parseInt(channelId) && c.role === 'admin');
            if (!entry) return res.status(403).json({ message: '해당 채널의 관리자가 아닙니다.' });
        }

        const pool = await getChannelPool(channel.databaseName);

        const existing = await queryOneInPool(pool, 'SELECT id FROM Users WHERE username = @username', { username });
        if (existing) return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const sessionId = uuidv4();

        const newId = await insertAndGetIdInPool(pool,
            `INSERT INTO Users (name, username, password, nickname, gender, birthdate, phone, recommender, registrationIp, role, status, currentSessionId, agreedToPrivacy)
             VALUES (@name, @username, @password, @nickname, @gender, @birthdate, @phone, @recommender, @registrationIp, @role, 'approved', @sessionId, 1)`,
            {
                name: name || nickname || username,
                username, password,
                nickname: nickname || null,
                gender: gender || 'none',
                birthdate: birthdate || null,
                phone: phone || null,
                recommender: recommender || null,
                registrationIp: clientIp,
                role: role || 'member',
                sessionId
            }
        );

        return res.status(201).json({ id: newId, _id: newId, username, name: name || nickname || username, role: role || 'member', channelId });
    } catch (error) {
        console.error('[Channel Member Create]', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/channel-members/:channelId/users/:userId/status
// 채널 회원 상태/권한 변경 (채널 DB 기준)
router.put('/:channelId/users/:userId/status', protect, admin, async (req, res) => {
    const { status, isChatBlocked, role } = req.body;
    const channelId = parseInt(req.params.channelId);
    const userId = parseInt(req.params.userId);
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel || !channel.databaseName) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        if (!req.user.isMaster) {
            const entry = (req.user.channels || []).find(c => c.channelId === channelId && c.role === 'admin');
            if (!entry) return res.status(403).json({ message: '권한이 없습니다.' });
        }

        const pool = await getChannelPool(channel.databaseName);
        const updates = [];
        const params = { id: userId };
        if (status) { updates.push('status=@status'); params.status = status; }
        if (typeof isChatBlocked === 'boolean') { updates.push('isChatBlocked=@isChatBlocked'); params.isChatBlocked = isChatBlocked ? 1 : 0; }
        if (role) { updates.push('role=@role'); params.role = role; }
        if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });

        await executeInPool(pool, `UPDATE Users SET ${updates.join(',')}, updatedAt=GETDATE() WHERE id=@id`, params);
        const updated = await queryOneInPool(pool, 'SELECT id, username, name, role, status, isChatBlocked FROM Users WHERE id=@id', { id: userId });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/channel-members/:channelId/users/:userId
// 채널 회원 삭제 (채널 DB에서 제거)
router.delete('/:channelId/users/:userId', protect, admin, async (req, res) => {
    const channelId = parseInt(req.params.channelId);
    const userId = parseInt(req.params.userId);
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel || !channel.databaseName) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        if (!req.user.isMaster) {
            const entry = (req.user.channels || []).find(c => c.channelId === channelId && c.role === 'admin');
            if (!entry) return res.status(403).json({ message: '권한이 없습니다.' });
        }

        const pool = await getChannelPool(channel.databaseName);
        await executeInPool(pool, 'DELETE FROM Users WHERE id=@id', { id: userId });
        res.json({ message: '회원이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
