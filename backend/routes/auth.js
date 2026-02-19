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
router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        isOnline: req.user.isOnline,
        lastLoginIp: req.user.lastLoginIp,
        lastLoginAt: req.user.lastLoginAt
    });
});

module.exports = router;
