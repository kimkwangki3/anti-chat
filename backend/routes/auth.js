const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { writeAuthLog } = require('../utils/logService');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    회원가입
// @access  Public
router.post('/register', async (req, res) => {
    const { name, username, password, role } = req.body;

    try {
        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        }

        const allowedRoles = ['admin', 'member'];
        const userRole = (role && allowedRoles.includes(role)) ? role : 'member';

        const user = await User.create({
            name,
            username,
            password,
            role: userRole
        });

        if (user) {
            writeAuthLog(`회원가입 완료: ${user.username} (${req.ip})`);
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
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

            user.isOnline = true;
            user.lastLoginIp = clientIp;
            user.lastLoginAt = Date.now();
            await user.save();

            writeAuthLog(`로그인: ${user.username} (IP: ${clientIp})`);

            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
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
// @desc    Update user profile (display name)
// @access  Private
router.patch('/profile', protect, async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: '이름을 입력해주세요.' });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { name: name.trim() },
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

module.exports = router;
