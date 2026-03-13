const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { writeAuthLog } = require('../utils/logService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// multer 메모리 스토리지 (Cloudinary 스트림 업로드용)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
    }
});

const profileUploadMiddleware = (req, res, next) => {
    upload.single('profileImage')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                message: '이미지 업로드에 실패했습니다.',
                detail: err.message
            });
        }
        next();
    });
};

const getFileExtension = (file) => {
    const extByMime = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    return extByMime[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
};

const saveProfileImageLocally = async (req, file) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const ext = getFileExtension(file);
    const fileName = `profile_${req.user._id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);

    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/profiles/${fileName}`;
};

// @route   POST /api/auth/register
// @desc    회원가입
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password, name, nickname, gender, birthdate, phone, recommender } = req.body;

    try {
        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        }

        const sessionId = uuidv4();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const user = await User.create({
            name: name || nickname || username,
            username,
            password,
            nickname,
            gender: gender || 'none',
            birthdate,
            phone,
            recommender,
            registrationIp: clientIp,
            role: 'member',
            currentSessionId: sessionId
        });

        if (user) {
            writeAuthLog(`회원가입 완료: ${user.username} (IP: ${clientIp})`);
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                nickname: user.nickname,
                role: user.role,
                sessionId: user.currentSessionId,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        console.error('회원가입 에러:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: '이미 가입된 아이디입니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// @route   POST /api/auth/login
// @desc    로그인 (IP 및 시간 기록)
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const sessionId = uuidv4();

            user.isOnline = true;
            user.lastLoginIp = clientIp;
            user.lastLoginAt = Date.now();
            user.currentSessionId = sessionId;
            await user.save();

            const io = req.app.get('io');
            if (io) {
                io.to(user._id.toString()).emit('force_logout', {
                    message: '다른 기기에서 로그인이 감지되었습니다.',
                    newSessionId: sessionId
                });
            }

            writeAuthLog(`로그인: ${user.username} (IP: ${clientIp})`);

            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                sessionId: user.currentSessionId,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/auth/profile
// @desc    Update user profile (display name + nickname)
// @access  Private
router.patch('/profile', protect, async (req, res) => {
    const { name, nickname } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: '이름을 입력해주세요.' });
    }

    try {
        const updateData = { name: name.trim() };
        if (nickname !== undefined) {
            updateData.nickname = nickname.trim();
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (updatedUser) {
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('프로필 수정 에러:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/auth/profile/image
// @desc    Upload or update user profile image (Cloudinary)
// @access  Private
router.post('/profile/image', protect, profileUploadMiddleware, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '이미지 파일이 없습니다.' });
        }

        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'profile_images',
                        transformation: [
                            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(buffer).pipe(stream);
            });
        };

        const hasCloudinaryConfig = Boolean(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );

        let profileImageUrl = null;

        if (hasCloudinaryConfig) {
            try {
                const result = await streamUpload(req.file.buffer);
                profileImageUrl = result.secure_url;
            } catch (cloudinaryError) {
                console.error('[Profile Image] Cloudinary upload failed, fallback to local upload:', cloudinaryError.message);
            }
        }

        if (!profileImageUrl) {
            profileImageUrl = await saveProfileImageLocally(req, req.file);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profileImage: profileImageUrl },
            { new: true }
        ).select('-password');

        res.json({ profileImage: profileImageUrl, user: updatedUser });
    } catch (error) {
        console.error('프로필 이미지 업로드 에러:', error);
        res.status(500).json({ message: '이미지 업로드에 실패했습니다.', detail: error.message });
    }
});

module.exports = router;
