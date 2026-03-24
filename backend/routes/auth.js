const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect } = require('../middleware/authMiddleware');
const { writeAuthLog } = require('../utils/logService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
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
    const fileName = `profile_${req.user.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/profiles/${fileName}`;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, name, nickname, gender, birthdate, phone, recommender } = req.body;
    try {
        const existing = await queryOne('SELECT id FROM Users WHERE username = @username', { username });
        if (existing) return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });

        const sessionId = uuidv4();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const id = await insertAndGetId(
            `INSERT INTO Users (name, username, password, nickname, gender, birthdate, phone, recommender, registrationIp, role, currentSessionId)
             VALUES (@name, @username, @password, @nickname, @gender, @birthdate, @phone, @recommender, @registrationIp, 'member', @sessionId)`,
            {
                name: name || nickname || username,
                username,
                password,
                nickname: nickname || null,
                gender: gender || 'none',
                birthdate: birthdate || null,
                phone: phone || null,
                recommender: recommender || null,
                registrationIp: clientIp,
                sessionId
            }
        );

        writeAuthLog(`회원가입 완료: ${username} (IP: ${clientIp})`);
        return res.status(201).json({
            _id: id,
            id,
            name: name || nickname || username,
            username,
            nickname: nickname || null,
            role: 'member',
            sessionId,
            token: generateToken(id)
        });
    } catch (error) {
        console.error('회원가입 에러:', error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await queryOne('SELECT * FROM Users WHERE username = @username', { username });

        if (user && user.password === password) {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const sessionId = uuidv4();

            await execute(
                'UPDATE Users SET isOnline=1, lastLoginIp=@ip, lastLoginAt=GETDATE(), currentSessionId=@sessionId WHERE id=@id',
                { ip: clientIp, sessionId, id: user.id }
            );

            const io = req.app.get('io');
            if (io) {
                io.to(String(user.id)).emit('force_logout', {
                    message: '다른 기기에서 로그인이 감지되었습니다.',
                    newSessionId: sessionId
                });
            }

            writeAuthLog(`로그인: ${user.username} (IP: ${clientIp})`);
            return res.json({
                _id: user.id,
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                sessionId,
                token: generateToken(user.id)
            });
        } else {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    try {
        const user = await queryOne(
            'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, recommender, role, isOnline, status, lastLoginAt, lastLoginIp, currentSessionId, createdAt FROM Users WHERE id = @id',
            { id: req.user.id }
        );
        if (user) return res.json(user);
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/auth/profile
router.patch('/profile', protect, async (req, res) => {
    const { name, nickname } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: '이름을 입력해주세요.' });
    try {
        await execute(
            'UPDATE Users SET name=@name, nickname=@nickname, updatedAt=GETDATE() WHERE id=@id',
            { name: name.trim(), nickname: nickname !== undefined ? nickname.trim() : req.user.nickname, id: req.user.id }
        );
        const user = await queryOne(
            'SELECT id, name, username, nickname, profileImage, role, status FROM Users WHERE id = @id',
            { id: req.user.id }
        );
        return res.json(user);
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
                console.error('[Profile Image] Cloudinary failed, fallback to local:', e.message);
            }
        }

        if (!profileImageUrl) profileImageUrl = await saveProfileImageLocally(req, req.file);

        await execute('UPDATE Users SET profileImage=@img, updatedAt=GETDATE() WHERE id=@id', { img: profileImageUrl, id: req.user.id });
        const user = await queryOne('SELECT id, name, username, nickname, profileImage, role FROM Users WHERE id=@id', { id: req.user.id });
        return res.json({ profileImage: profileImageUrl, user });
    } catch (error) {
        console.error('프로필 이미지 업로드 에러:', error);
        res.status(500).json({ message: '이미지 업로드에 실패했습니다.', detail: error.message });
    }
});

module.exports = router;
