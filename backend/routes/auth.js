const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query, queryOne, execute, getChannelPool, queryOneInPool, executeInPool } = require('../db/mssql');
const { protect } = require('../middleware/authMiddleware');
const { writeAuthLog } = require('../utils/logService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

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
    const { username, password } = req.body;
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

        // 2. 모든 활성 채널 DB 검색
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
                        'UPDATE Users SET isOnline=1, lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id',
                        { ip: clientIp, sessionId, id: user.id }
                    );
                }
            } catch (e) {
                console.error(`[Login] 채널 DB 오류 (${ch.databaseName}):`, e.message);
            }
        }

        if (!foundChannels.length) {
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
