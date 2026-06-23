const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query, queryOne, execute, getChannelPool, queryOneInPool, executeInPool, insertAndGetIdInPool } = require('../db/mssql');
const { protect } = require('../middleware/authMiddleware');
const { writeAuthLog } = require('../utils/logService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// ===== SSO(외부 시스템 자동 로그인) 일회용 코드 저장소 =====
const ssoCodes = new Map(); // code -> { username, channelId, expiresAt }
const SSO_TTL_MS = 60 * 1000; // 60초
const cleanupSsoCodes = () => {
    const now = Date.now();
    for (const [code, v] of ssoCodes) { if (v.expiresAt < now) ssoCodes.delete(code); }
};

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
});

const profileUploadMiddleware = (req, res, next) => {
    upload.single('profileImage')(req, res, (err) => {
        if (err) return res.status(400).json({ message: '이미지 업로드에 실패했습니다.', detail: err.message });
        next();
    });
};

const getFileExtension = (file) => {
    const extByMime = {
        'image/jpeg': '.jpg', 'image/png': '.png',
        'image/webp': '.webp', 'image/gif': '.gif'
    };
    return extByMime[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
};

const saveProfileImageLocally = async (req, file) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const ext = getFileExtension(file);
    const userId = req.user.id || req.user.username;
    const fileName = `profile_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/profiles/${fileName}`;
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password, channelId } = req.body;

    // 'admin' 계정 로그인 영구 차단 (기본 시드 계정 — 보안). 실제 최고관리자는 'gtadmin' 사용.
    if ((username || '').trim().toLowerCase() === 'admin') {
        return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const sessionId = uuidv4();

        // 1. 슈퍼어드민 확인 (마스터 DB)
        const masterUser = await queryOne('SELECT * FROM Users WHERE username = @username', { username });
        if (masterUser && masterUser.password === password && masterUser.role === 'superadmin') {
            await execute(
                'UPDATE Users SET isOnline=1, lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id',
                { ip: clientIp, sessionId, id: masterUser.id }
            );
            const io = req.app.get('io');
            if (io) io.to(String(masterUser.id)).emit('force_logout', { message: '다른 기기에서 로그인이 감지되었습니다.', newSessionId: sessionId });
            writeAuthLog(`슈퍼어드민 로그인: ${username} (IP: ${clientIp})`);
            const token = jwt.sign({ isMaster: true, id: masterUser.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            return res.json({
                _id: masterUser.id, id: masterUser.id,
                name: masterUser.name, username: masterUser.username,
                role: 'superadmin', sessionId, token, isMaster: true
            });
        }

        // 1.5. 마스터 DB 채널관리자(role='admin') 확인 (A안)
        if (masterUser && masterUser.password === password && masterUser.role === 'admin') {
            if (masterUser.status && masterUser.status !== 'active') {
                return res.status(403).json({ message: '계정이 정지되었습니다. 관리자에게 문의하세요.' });
            }
            await execute(
                'UPDATE Users SET isOnline=1, lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id',
                { ip: clientIp, sessionId, id: masterUser.id }
            );
            const io = req.app.get('io');
            if (io) io.to(String(masterUser.id)).emit('force_logout', { message: '다른 기기에서 로그인이 감지되었습니다.', newSessionId: sessionId });
            writeAuthLog(`채널관리자 로그인: ${username} (IP: ${clientIp})`);
            const token = jwt.sign({ isAdminMaster: true, id: masterUser.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            return res.json({
                _id: masterUser.id, id: masterUser.id,
                name: masterUser.name, nickname: masterUser.nickname,
                username: masterUser.username, role: 'admin',
                sessionId, token, isMaster: false, isAdminMaster: true
            });
        }

        // 메인 로그인(channelId 없음): 관리자(superadmin/admin)만 위에서 통과.
        // 여기까지 왔다는 건 일반회원이 메인에서 시도한 것 → 조용히 거부.
        if (!channelId) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // === 채널 로그인 (channelId 있음): 해당 채널 회원만 ===
        // 2. 모든 활성 채널 DB 검색 (멀티채널 가입자는 전체 채널 확보)
        const activeChannels = await query(
            "SELECT id, name, databaseName FROM Channels WHERE status='active' AND databaseName IS NOT NULL"
        );
        const foundChannels = [];
        let firstName = username, firstNickname = null;

        for (const ch of activeChannels) {
            try {
                const pool = await getChannelPool(ch.databaseName);
                const user = await queryOneInPool(pool, 'SELECT * FROM Users WHERE username = @username', { username });
                if (user && user.password === password) {
                    if (foundChannels.length === 0) {
                        firstName = user.name;
                        firstNickname = user.nickname;
                    }
                    foundChannels.push({
                        channelId: ch.id,
                        dbName: ch.databaseName,
                        userId: user.id,
                        role: user.role,
                        channelName: ch.name
                    });
                    await executeInPool(pool,
                        'UPDATE Users SET isOnline=1, presenceStatus=@status, lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id',
                        { status: 'online', ip: clientIp, sessionId, id: user.id }
                    );
                    await insertAndGetIdInPool(pool,
                        'INSERT INTO LoginHistory (userId, ip, userAgent) VALUES (@userId, @ip, @userAgent)',
                        { userId: user.id, ip: clientIp, userAgent: req.headers['user-agent'] || '' }
                    );
                }
            } catch (e) {
                console.error(`[Login] 채널 DB 오류 (${ch.databaseName}):`, e.message);
            }
        }

        // 이 채널 로그인창은 해당 채널 회원만 허용 (이 채널 멤버가 아니면 거부)
        const targetChannelId = parseInt(channelId);
        if (!foundChannels.length || !foundChannels.some(c => c.channelId === targetChannelId)) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const overallRole = foundChannels.some(c => c.role === 'admin') ? 'admin' : 'member';
        writeAuthLog(`로그인: ${username} (IP: ${clientIp}), 채널 ${foundChannels.length}개`);
        const token = jwt.sign({ username, channels: foundChannels }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return res.json({
            _id: foundChannels[0].userId, id: foundChannels[0].userId,
            name: firstName, nickname: firstNickname,
            username, role: overallRole,
            channels: foundChannels, sessionId, token, isMaster: false
        });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/sso — 외부(델파이) 시스템이 호출. 비밀키 검증 후 일회용 코드 발급
// body: { username, channelId 또는 channelSlug, secret }
router.post('/sso', async (req, res) => {
    const { username, channelId, channelSlug, secret } = req.body;
    if (!process.env.SSO_SECRET || secret !== process.env.SSO_SECRET) {
        return res.status(403).json({ message: '인증에 실패했습니다.' });
    }
    if (!username || (!channelId && !channelSlug)) {
        return res.status(400).json({ message: 'username 과 channelId(또는 channelSlug)가 필요합니다.' });
    }
    try {
        const channel = channelId
            ? await queryOne("SELECT id, databaseName FROM Channels WHERE id=@id AND status='active'", { id: channelId })
            : await queryOne("SELECT id, databaseName FROM Channels WHERE slug=@slug AND status='active'", { slug: channelSlug });
        if (!channel?.databaseName) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        const pool = await getChannelPool(channel.databaseName);
        const user = await queryOneInPool(pool, 'SELECT id FROM Users WHERE username=@username', { username });
        if (!user) return res.status(404).json({ message: '해당 채널에 사용자가 없습니다.' });

        cleanupSsoCodes();
        const code = crypto.randomBytes(24).toString('hex');
        ssoCodes.set(code, { username, channelId: channel.id, expiresAt: Date.now() + SSO_TTL_MS });
        return res.json({ code, expiresInSec: SSO_TTL_MS / 1000 });
    } catch (error) {
        console.error('[SSO] 코드 발급 오류:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/sso/exchange — 웹앱이 일회용 코드를 JWT로 교환 (자동 로그인)
router.post('/sso/exchange', async (req, res) => {
    const { code } = req.body;
    cleanupSsoCodes();
    const entry = code && ssoCodes.get(code);
    if (!entry) return res.status(401).json({ message: '유효하지 않거나 만료된 코드입니다.' });
    ssoCodes.delete(code); // 일회용 — 즉시 폐기
    try {
        const { username, channelId } = entry;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const sessionId = uuidv4();

        // 채널 로그인과 동일: 전체 채널에서 해당 아이디 확보(멀티채널), 비번 검증은 코드로 대체(신뢰)
        const activeChannels = await query("SELECT id, name, databaseName FROM Channels WHERE status='active' AND databaseName IS NOT NULL");
        const foundChannels = [];
        let firstName = username, firstNickname = null;
        for (const ch of activeChannels) {
            try {
                const pool = await getChannelPool(ch.databaseName);
                const user = await queryOneInPool(pool, 'SELECT * FROM Users WHERE username=@username', { username });
                if (user) {
                    if (!foundChannels.length) { firstName = user.name; firstNickname = user.nickname; }
                    foundChannels.push({ channelId: ch.id, dbName: ch.databaseName, userId: user.id, role: user.role, channelName: ch.name });
                    await executeInPool(pool,
                        "UPDATE Users SET isOnline=1, presenceStatus='online', lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id",
                        { ip: clientIp, sessionId, id: user.id }
                    );
                }
            } catch (e) { /* 개별 채널 오류 무시 */ }
        }
        if (!foundChannels.some(c => c.channelId === channelId)) {
            return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        const overallRole = foundChannels.some(c => c.role === 'admin') ? 'admin' : 'member';
        const token = jwt.sign({ username, channels: foundChannels }, process.env.JWT_SECRET, { expiresIn: '30d' });
        const ch = await queryOne('SELECT slug FROM Channels WHERE id=@id', { id: channelId });
        writeAuthLog(`SSO 자동로그인: ${username} (채널 ${channelId})`);
        return res.json({
            _id: foundChannels[0].userId, id: foundChannels[0].userId,
            name: firstName, nickname: firstNickname,
            username, role: overallRole,
            channels: foundChannels, sessionId, token, isMaster: false,
            channelSlug: ch?.slug || null
        });
    } catch (error) {
        console.error('[SSO] 교환 오류:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/login-direct — 외부 프로그램이 URL 파라미터(id, pwd, 보안번호)로 직접 자동 로그인
// body: { username, password, channelId 또는 channelSlug, key(보안번호) }
router.post('/login-direct', async (req, res) => {
    const { username, password, channelId, channelSlug, key } = req.body;
    // 보안번호(key)는 선택: 값이 들어오면 검증, 없으면 비밀번호 인증만으로 진행
    if (key) {
        if (!process.env.SSO_SECRET || key !== process.env.SSO_SECRET) {
            return res.status(403).json({ message: '보안 인증에 실패했습니다.' });
        }
    }
    if (!username || !password || (!channelId && !channelSlug)) {
        return res.status(400).json({ message: 'id, pwd, channel 정보가 필요합니다.' });
    }
    if ((username || '').trim().toLowerCase() === 'admin') {
        return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }
    try {
        const channel = channelId
            ? await queryOne("SELECT id FROM Channels WHERE id=@id AND status='active'", { id: channelId })
            : await queryOne("SELECT id FROM Channels WHERE slug=@slug AND status='active'", { slug: channelSlug });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        const targetChannelId = channel.id;

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const sessionId = uuidv4();
        const activeChannels = await query("SELECT id, name, databaseName FROM Channels WHERE status='active' AND databaseName IS NOT NULL");
        const foundChannels = [];
        let firstName = username, firstNickname = null;
        for (const ch of activeChannels) {
            try {
                const pool = await getChannelPool(ch.databaseName);
                const user = await queryOneInPool(pool, 'SELECT * FROM Users WHERE username=@username', { username });
                if (user && user.password === password) {
                    if (!foundChannels.length) { firstName = user.name; firstNickname = user.nickname; }
                    foundChannels.push({ channelId: ch.id, dbName: ch.databaseName, userId: user.id, role: user.role, channelName: ch.name });
                    await executeInPool(pool,
                        "UPDATE Users SET isOnline=1, presenceStatus='online', lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id",
                        { ip: clientIp, sessionId, id: user.id }
                    );
                }
            } catch (e) { /* 개별 채널 오류 무시 */ }
        }
        if (!foundChannels.length || !foundChannels.some(c => c.channelId === targetChannelId)) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        const overallRole = foundChannels.some(c => c.role === 'admin') ? 'admin' : 'member';
        const token = jwt.sign({ username, channels: foundChannels }, process.env.JWT_SECRET, { expiresIn: '30d' });
        const chSlug = (await queryOne('SELECT slug FROM Channels WHERE id=@id', { id: targetChannelId }))?.slug || null;
        writeAuthLog(`직접 자동로그인: ${username} (채널 ${targetChannelId}, IP ${clientIp})`);
        return res.json({
            _id: foundChannels[0].userId, id: foundChannels[0].userId,
            name: firstName, nickname: firstNickname,
            username, role: overallRole,
            channels: foundChannels, sessionId, token, isMaster: false,
            channelSlug: chSlug
        });
    } catch (error) {
        console.error('[LoginDirect] 오류:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    try {
        if (req.user.isMaster) {
            const user = await queryOne(
                'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, recommender, role, isOnline, status, lastLoginAt, lastLoginIp, currentSessionId, createdAt FROM Users WHERE id = @id',
                { id: req.user.id }
            );
            if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            return res.json({ ...user, isMaster: true });
        }

        if (req.user.isAdminMaster) {
            // 채널관리자 (마스터 DB)
            const user = await queryOne(
                'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, recommender, role, isOnline, status, lastLoginAt, lastLoginIp, currentSessionId, createdAt FROM Users WHERE id = @id',
                { id: req.user.id }
            );
            if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            return res.json({ ...user, role: 'admin', isMaster: false, isAdminMaster: true });
        }

        // 채널 유저 — 첫 번째 채널 DB에서 최신 데이터 조회
        const channels = req.user.channels;
        const firstChannel = channels[0];
        const pool = await getChannelPool(firstChannel.dbName);
        const user = await queryOneInPool(pool,
            'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, role, isOnline, status, lastLoginAt, createdAt FROM Users WHERE id = @id',
            { id: firstChannel.userId }
        );
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        const overallRole = channels.some(c => c.role === 'admin') ? 'admin' : 'member';
        return res.json({ ...user, channels, role: overallRole, isMaster: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/auth/profile
router.patch('/profile', protect, async (req, res) => {
    const { name, nickname } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: '이름을 입력해주세요.' });
    try {
        if (req.user.isMaster) {
            await execute(
                'UPDATE Users SET name=@name, nickname=@nickname, updatedAt=GETDATE() WHERE id=@id',
                { name: name.trim(), nickname: nickname !== undefined ? nickname.trim() : req.user.nickname, id: req.user.id }
            );
            const user = await queryOne('SELECT id, name, username, nickname, profileImage, role, status FROM Users WHERE id = @id', { id: req.user.id });
            return res.json({ ...user, isMaster: true });
        }

        // 채널 유저 — 모든 채널 DB에서 업데이트
        const channels = req.user.channels;
        for (const ch of channels) {
            try {
                const pool = await getChannelPool(ch.dbName);
                await executeInPool(pool,
                    'UPDATE Users SET name=@name, nickname=@nickname, updatedAt=GETDATE() WHERE id=@id',
                    { name: name.trim(), nickname: nickname !== undefined ? nickname.trim() : req.user.nickname, id: ch.userId }
                );
            } catch (e) {
                console.error(`[Profile] DB 업데이트 오류 (${ch.dbName}):`, e.message);
            }
        }
        return res.json({ ...req.user, name: name.trim(), nickname: nickname !== undefined ? nickname.trim() : req.user.nickname });
    } catch (error) {
        console.error('프로필 수정 에러:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/profile/image
router.post('/profile/image', protect, profileUploadMiddleware, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '이미지 파일이 없습니다.' });

        const hasCloudinaryConfig = Boolean(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );

        let profileImageUrl = null;

        if (hasCloudinaryConfig) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'profile_images', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }, { quality: 'auto', fetch_format: 'auto' }] },
                        (error, result) => { if (result) resolve(result); else reject(error); }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
                profileImageUrl = result.secure_url;
            } catch (e) {
                console.error('[Profile Image] Cloudinary 실패, 로컬 저장:', e.message);
            }
        }

        if (!profileImageUrl) profileImageUrl = await saveProfileImageLocally(req, req.file);

        if (req.user.isMaster) {
            await execute('UPDATE Users SET profileImage=@img, updatedAt=GETDATE() WHERE id=@id', { img: profileImageUrl, id: req.user.id });
            const user = await queryOne('SELECT id, name, username, nickname, profileImage, role FROM Users WHERE id=@id', { id: req.user.id });
            return res.json({ profileImage: profileImageUrl, user: { ...user, isMaster: true } });
        }

        // 채널 유저 — 모든 채널 DB에서 업데이트
        const channels = req.user.channels;
        for (const ch of channels) {
            try {
                const pool = await getChannelPool(ch.dbName);
                await executeInPool(pool, 'UPDATE Users SET profileImage=@img, updatedAt=GETDATE() WHERE id=@id', { img: profileImageUrl, id: ch.userId });
            } catch (e) {
                console.error(`[Profile Image] DB 오류 (${ch.dbName}):`, e.message);
            }
        }
        return res.json({ profileImage: profileImageUrl, user: { ...req.user, profileImage: profileImageUrl } });
    } catch (error) {
        console.error('프로필 이미지 업로드 에러:', error);
        res.status(500).json({ message: '이미지 업로드에 실패했습니다.', detail: error.message });
    }
});

module.exports = router;
