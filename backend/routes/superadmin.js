const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId, getChannelPool, queryOneInPool } = require('../db/mssql');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// 아이디 중복검사 — 마스터 DB + 모든 채널 DB 전체 확인
const isUsernameTakenAnywhere = async (username) => {
    const inMaster = await queryOne('SELECT id FROM Users WHERE username = @username', { username });
    if (inMaster) return true;
    const channels = await query("SELECT databaseName FROM Channels WHERE databaseName IS NOT NULL");
    for (const ch of channels) {
        try {
            const pool = await getChannelPool(ch.databaseName);
            const found = await queryOneInPool(pool, 'SELECT id FROM Users WHERE username = @username', { username });
            if (found) return true;
        } catch (e) {
            console.error(`[중복검사] 채널 DB 오류 (${ch.databaseName}):`, e.message);
        }
    }
    return false;
};

router.use(protect, superAdmin);

const usernamePattern = /^(?=.{4,20}$)[a-z0-9._-]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;
const birthdatePattern = /^\d{4}-\d{2}-\d{2}$/;
const phonePattern = /^[0-9-+()\s]{8,20}$/;

const validateAdminPayload = ({ username, password, name, nickname, gender, birthdate, phone }) => {
    if (!username || !password || !name) return '아이디, 비밀번호, 이름은 필수입니다.';
    const u = username.trim().toLowerCase();
    const n = name.trim();
    const nick = nickname?.trim() || '';
    const ph = phone?.trim() || '';
    if (!usernamePattern.test(u)) return '아이디는 4~20자의 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.';
    if (!passwordPattern.test(password)) return '비밀번호는 8~20자이며 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.';
    if (n.length < 2 || n.length > 20) return '이름은 2자 이상 20자 이하로 입력해 주세요.';
    if (nick && nick.length > 20) return '닉네임은 20자 이하로 입력해 주세요.';
    if (birthdate && !birthdatePattern.test(birthdate)) return '생년월일 형식이 올바르지 않습니다.';
    if (ph && !phonePattern.test(ph)) return '연락처 형식이 올바르지 않습니다.';
    if (gender && !['male', 'female', 'other', 'none'].includes(gender)) return '성별 값이 올바르지 않습니다.';
    return null;
};

// GET /api/superadmin/admins/check-username
router.get('/admins/check-username', async (req, res) => {
    const username = req.query.username?.trim().toLowerCase();
    if (!username) return res.status(400).json({ message: '아이디를 입력해 주세요.' });
    if (!usernamePattern.test(username)) return res.status(400).json({ message: '아이디 형식이 올바르지 않습니다.' });
    const taken = await isUsernameTakenAnywhere(username);
    res.json({ available: !taken, message: taken ? '이미 사용 중인 아이디입니다. (전체 회원/채널 회원 포함)' : '사용 가능한 아이디입니다.' });
});

// POST /api/superadmin/admins
router.post('/admins', async (req, res) => {
    const { username, password, name, nickname, gender, birthdate, phone } = req.body;
    const validationError = validateAdminPayload({ username, password, name, nickname, gender, birthdate, phone });
    if (validationError) return res.status(400).json({ message: validationError });

    try {
        const normalizedUsername = username.trim().toLowerCase();
        const taken = await isUsernameTakenAnywhere(normalizedUsername);
        if (taken) return res.status(400).json({ message: '이미 사용 중인 아이디입니다. (전체 회원/채널 회원 포함)' });

        const id = await insertAndGetId(
            `INSERT INTO Users (username, password, name, nickname, gender, birthdate, phone, role, status)
             VALUES (@username, @password, @name, @nickname, @gender, @birthdate, @phone, 'admin', 'active')`,
            { username: normalizedUsername, password, name: name.trim(), nickname: nickname?.trim() || '', gender: gender || 'none', birthdate: birthdate || '', phone: phone?.trim() || '' }
        );

        const user = await queryOne('SELECT id, username, name, nickname, role, status, createdAt FROM Users WHERE id = @id', { id });
        res.status(201).json({ ...user, _id: user.id });
    } catch (error) {
        console.error('Admin creation failed:', error);
        res.status(500).json({ message: '관리자 계정 생성에 실패했습니다.' });
    }
});

// GET /api/superadmin/stats
router.get('/stats', async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [newUsers, newChannels, newPosts, totalUsers, totalChannels, totalPosts] = await Promise.all([
            queryOne('SELECT COUNT(*) as cnt FROM Users WHERE createdAt >= @today', { today }),
            queryOne('SELECT COUNT(*) as cnt FROM Channels WHERE createdAt >= @today', { today }),
            queryOne('SELECT COUNT(*) as cnt FROM Posts WHERE createdAt >= @today', { today }),
            queryOne('SELECT COUNT(*) as cnt FROM Users', {}),
            queryOne('SELECT COUNT(*) as cnt FROM Channels', {}),
            queryOne('SELECT COUNT(*) as cnt FROM Posts', {})
        ]);
        res.json({
            today: { newUsers: newUsers.cnt, newChannels: newChannels.cnt, newPosts: newPosts.cnt },
            total: { totalUsers: totalUsers.cnt, totalChannels: totalChannels.cnt, totalPosts: totalPosts.cnt }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/users
router.get('/users', async (req, res) => {
    try {
        const users = await query('SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, recommender, registrationIp, registrationMac, role, isOnline, status, lastLoginAt, lastLoginIp, createdAt FROM Users ORDER BY createdAt DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/users/:id/password
router.get('/users/:id/password', async (req, res) => {
    try {
        const user = await queryOne('SELECT id, username, password FROM Users WHERE id = @id', { id: req.params.id });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        res.json({ username: user.username, password: user.password });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/users-password/:id
router.get('/users-password/:id', async (req, res) => {
    try {
        const user = await queryOne('SELECT id, username, password FROM Users WHERE id = @id', { id: req.params.id });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        res.json({ username: user.username, password: user.password });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/superadmin/users/:id
router.put('/users/:id', async (req, res) => {
    const { name, nickname, phone, birthdate, gender, password, memo } = req.body;
    try {
        const user = await queryOne('SELECT * FROM Users WHERE id = @id', { id: req.params.id });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

        const updates = [];
        const params = { id: user.id };

        if (typeof name === 'string') {
            const t = name.trim();
            if (t.length < 2 || t.length > 20) return res.status(400).json({ message: '이름은 2자 이상 20자 이하로 입력해 주세요.' });
            updates.push('name=@name'); params.name = t;
        }
        if (typeof nickname === 'string') {
            const t = nickname.trim();
            if (t.length > 20) return res.status(400).json({ message: '닉네임은 20자 이하로 입력해 주세요.' });
            updates.push('nickname=@nickname'); params.nickname = t;
        }
        if (typeof phone === 'string') {
            const t = phone.trim();
            if (t && !phonePattern.test(t)) return res.status(400).json({ message: '연락처 형식이 올바르지 않습니다.' });
            updates.push('phone=@phone'); params.phone = t;
        }
        if (typeof birthdate === 'string') {
            const t = birthdate.trim();
            if (t && !birthdatePattern.test(t)) return res.status(400).json({ message: '생년월일 형식이 올바르지 않습니다.' });
            updates.push('birthdate=@birthdate'); params.birthdate = t;
        }
        if (typeof gender === 'string') {
            if (!['male', 'female', 'other', 'none'].includes(gender)) return res.status(400).json({ message: '성별 값이 올바르지 않습니다.' });
            updates.push('gender=@gender'); params.gender = gender;
        }
        if (typeof memo === 'string') {
            const t = memo.trim();
            if (t.length > 500) return res.status(400).json({ message: '메모는 500자 이하로 입력해 주세요.' });
            updates.push('memo=@memo'); params.memo = t;
        }
        if (typeof password === 'string' && password.trim() !== '') {
            if (!passwordPattern.test(password)) return res.status(400).json({ message: '비밀번호는 8~20자, 영문/숫자/특수문자를 각각 1개 이상 포함해야 합니다.' });
            updates.push('password=@password'); params.password = password;
        }

        if (updates.length) {
            await execute(`UPDATE Users SET ${updates.join(',')}, updatedAt=GETDATE() WHERE id=@id`, params);
        }

        const updated = await queryOne('SELECT id, name, username, nickname, phone, birthdate, gender, memo, role, status FROM Users WHERE id=@id', { id: user.id });
        res.json({ message: '회원 정보가 수정되었습니다.', user: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/superadmin/users/:id/status
router.put('/users/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const user = await queryOne('SELECT * FROM Users WHERE id = @id', { id: req.params.id });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

        const prevStatus = user.status;
        await execute('UPDATE Users SET status=@status, updatedAt=GETDATE() WHERE id=@id', { status, id: user.id });

        if (user.role === 'admin' || user.role === 'superadmin') {
            if (status === 'suspended' || status === 'withdrawn') {
                await execute('UPDATE Channels SET status=\'suspended\', updatedAt=GETDATE() WHERE ownerId=@ownerId', { ownerId: user.id });
            } else if (status === 'active' && (prevStatus === 'suspended' || prevStatus === 'withdrawn')) {
                await execute('UPDATE Channels SET status=\'active\', updatedAt=GETDATE() WHERE ownerId=@ownerId', { ownerId: user.id });
            }
        }

        if (status === 'suspended' || status === 'withdrawn') {
            await execute('UPDATE ChannelMembers SET status=\'inactive\', updatedAt=GETDATE() WHERE userId=@userId AND status=\'approved\'', { userId: user.id });
        } else if (status === 'active' && (prevStatus === 'suspended' || prevStatus === 'withdrawn')) {
            await execute('UPDATE ChannelMembers SET status=\'approved\', updatedAt=GETDATE() WHERE userId=@userId AND status=\'inactive\'', { userId: user.id });
        }

        const updated = await queryOne('SELECT * FROM Users WHERE id=@id', { id: user.id });
        res.json({ message: `사용자 상태가 ${status}로 변경되었습니다.`, user: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/channels
router.get('/channels', async (req, res) => {
    try {
        const channels = await query('SELECT * FROM Channels ORDER BY createdAt DESC');
        const channelStats = await Promise.all(channels.map(async (c) => {
            const [members, notices, posts] = await Promise.all([
                queryOne('SELECT COUNT(*) as cnt FROM ChannelMembers WHERE channelId=@id AND status=\'approved\'', { id: c.id }),
                queryOne('SELECT COUNT(*) as cnt FROM Notices WHERE channelId=@id', { id: c.id }),
                queryOne('SELECT COUNT(*) as cnt FROM Posts WHERE channelId=@id', { id: c.id })
            ]);
            return { ...c, stats: { memberCount: members.cnt, noticeCount: notices.cnt, postCount: posts.cnt } };
        }));
        res.json(channelStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/superadmin/channels/:id/status
router.put('/channels/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id=@id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        await execute('UPDATE Channels SET status=@status, updatedAt=GETDATE() WHERE id=@id', { status, id: channel.id });
        const updated = await queryOne('SELECT * FROM Channels WHERE id=@id', { id: channel.id });
        res.json({ message: `채널 상태가 ${status}로 변경되었습니다.`, channel: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/superadmin/channels/:id/owner — 채널에 관리자 임명/배정 (A안)
router.put('/channels/:id/owner', async (req, res) => {
    const { ownerId } = req.body;
    try {
        const channel = await queryOne('SELECT id FROM Channels WHERE id=@id', { id: req.params.id });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        const owner = await queryOne('SELECT id, name, username, role FROM Users WHERE id=@id', { id: ownerId });
        if (!owner || !['admin', 'superadmin'].includes(owner.role)) {
            return res.status(400).json({ message: '관리자(admin) 계정만 채널에 배정할 수 있습니다.' });
        }

        await execute('UPDATE Channels SET ownerId=@ownerId, updatedAt=GETDATE() WHERE id=@id', { ownerId, id: channel.id });

        // 기존 채팅방의 adminId도 새 관리자로 재배정 (임명 전에 만들어진 방이 새 관리자에게 보이고 알림 가도록)
        await execute('UPDATE ChatRooms SET adminId=@ownerId, updatedAt=GETDATE() WHERE channelId=@id', { ownerId, id: channel.id });

        res.json({ message: `채널 관리자를 ${owner.name}(으)로 배정했습니다.`, ownerId, ownerName: owner.name });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/channels/:id/detail
router.get('/channels/:id/detail', async (req, res) => {
    try {
        const [members, notices, posts] = await Promise.all([
            query(`SELECT cm.*, u.name, u.username, u.isOnline, u.status as userStatus FROM ChannelMembers cm JOIN Users u ON cm.userId = u.id WHERE cm.channelId = @id`, { id: req.params.id }),
            query(`SELECT n.*, u.name as authorName FROM Notices n JOIN Users u ON n.authorId = u.id WHERE n.channelId = @id`, { id: req.params.id }),
            query(`SELECT p.*, u.name as authorName FROM Posts p JOIN Users u ON p.authorId = u.id WHERE p.channelId = @id`, { id: req.params.id })
        ]);
        res.json({
            members: members.map(m => ({ ...m, userId: { _id: m.userId, id: m.userId, name: m.name, username: m.username, isOnline: m.isOnline, status: m.userStatus } })),
            notices: notices.map(n => ({ ...n, authorId: { _id: n.authorId, id: n.authorId, name: n.authorName } })),
            posts: posts.map(p => ({ ...p, authorId: { _id: p.authorId, id: p.authorId, name: p.authorName }, attachments: p.attachments ? JSON.parse(p.attachments) : [] }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/chats/search
router.get('/chats/search', async (req, res) => {
    const { channelName, userName } = req.query;
    try {
        let whereClauses = ['1=1'];
        const params = {};
        if (channelName) { whereClauses.push('c.name LIKE @channelName'); params.channelName = `%${channelName}%`; }
        if (userName) { whereClauses.push('u.name LIKE @userName'); params.userName = `%${userName}%`; }

        const messages = await query(
            `SELECT TOP 100 m.id, m.content, m.createdAt,
                u.id as senderId, u.name as senderName, u.username as senderUsername,
                ch.id as channelId, ch.name as channelName
             FROM Messages m
             JOIN Users u ON m.senderId = u.id
             JOIN ChatRooms r ON m.roomId = r.id
             JOIN Channels ch ON r.channelId = ch.id
             WHERE ${whereClauses.join(' AND ')}
             ORDER BY m.createdAt DESC`,
            params
        );
        res.json(messages.map(m => ({
            _id: m.id, id: m.id, content: m.content, createdAt: m.createdAt,
            sender: { _id: m.senderId, id: m.senderId, name: m.senderName, username: m.senderUsername },
            channelId: { _id: m.channelId, id: m.channelId, name: m.channelName }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/superadmin/channels/:id/messages
router.get('/channels/:id/messages', async (req, res) => {
    try {
        const messages = await query(
            `SELECT m.id, m.content, m.createdAt, u.id as senderId, u.name as senderName, u.username as senderUsername
             FROM Messages m JOIN Users u ON m.senderId = u.id
             JOIN ChatRooms r ON m.roomId = r.id
             WHERE r.channelId = @channelId ORDER BY m.createdAt ASC`,
            { channelId: req.params.id }
        );
        res.json(messages.map(m => ({
            _id: m.id, content: m.content, createdAt: m.createdAt,
            sender: { _id: m.senderId, id: m.senderId, name: m.senderName, username: m.senderUsername }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/superadmin/posts/:id
router.delete('/posts/:id', async (req, res) => {
    try {
        await execute('DELETE FROM Posts WHERE id=@id', { id: req.params.id });
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/superadmin/notices/:id
router.delete('/notices/:id', async (req, res) => {
    try {
        await execute('DELETE FROM Notices WHERE id=@id', { id: req.params.id });
        res.json({ message: '공지사항이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/superadmin/channels/:channelId/members/:userId
router.delete('/channels/:channelId/members/:userId', async (req, res) => {
    try {
        await execute('DELETE FROM ChannelMembers WHERE channelId=@channelId AND userId=@userId', { channelId: req.params.channelId, userId: req.params.userId });
        res.json({ message: '회원이 채널에서 제외되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
