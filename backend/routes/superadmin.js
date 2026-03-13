const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const ChannelMember = require('../models/ChannelMember');
const Notice = require('../models/Notice');
const Post = require('../models/Post');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// 모든 라우트에 최고관리자 권한 적용
router.use(protect, superAdmin);

const usernamePattern = /^(?=.{4,20}$)[a-z0-9._-]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;
const birthdatePattern = /^\d{4}-\d{2}-\d{2}$/;
const phonePattern = /^[0-9-+()\s]{8,20}$/;

const validateAdminPayload = ({ username, password, name, nickname, gender, birthdate, phone }) => {
    if (!username || !password || !name) {
        return '아이디, 비밀번호, 이름은 필수입니다.';
    }

    const normalizedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedNickname = nickname?.trim() || '';
    const trimmedPhone = phone?.trim() || '';

    if (!usernamePattern.test(normalizedUsername)) {
        return '아이디는 4~20자의 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.';
    }

    if (!passwordPattern.test(password)) {
        return '비밀번호는 8~20자이며 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.';
    }

    if (trimmedName.length < 2 || trimmedName.length > 20) {
        return '이름은 2자 이상 20자 이하로 입력해 주세요.';
    }

    if (trimmedNickname && trimmedNickname.length > 20) {
        return '닉네임은 20자 이하로 입력해 주세요.';
    }

    if (birthdate && !birthdatePattern.test(birthdate)) {
        return '생년월일 형식이 올바르지 않습니다.';
    }

    if (trimmedPhone && !phonePattern.test(trimmedPhone)) {
        return '연락처 형식이 올바르지 않습니다.';
    }

    if (gender && !['male', 'female', 'other', 'none'].includes(gender)) {
        return '성별 값이 올바르지 않습니다.';
    }

    return null;
};

router.get('/admins/check-username', async (req, res) => {
    const username = req.query.username?.trim().toLowerCase();

    if (!username) {
        return res.status(400).json({ message: '아이디를 입력해 주세요.' });
    }

    if (!usernamePattern.test(username)) {
        return res.status(400).json({ message: '아이디 형식이 올바르지 않습니다.' });
    }

    const existingUser = await User.findOne({ username }).select('_id');
    res.json({
        available: !existingUser,
        message: existingUser ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.'
    });
});

router.post('/admins', async (req, res) => {
    const { username, password, name, nickname, gender, birthdate, phone } = req.body;
    const validationError = validateAdminPayload({ username, password, name, nickname, gender, birthdate, phone });

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const normalizedUsername = username.trim().toLowerCase();
        const existingUser = await User.findOne({ username: normalizedUsername });

        if (existingUser) {
            return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
        }

        const adminUser = await User.create({
            username: normalizedUsername,
            password,
            name: name.trim(),
            nickname: nickname?.trim() || '',
            gender: gender || 'none',
            birthdate: birthdate || '',
            phone: phone?.trim() || '',
            role: 'admin',
            status: 'active'
        });

        res.status(201).json({
            _id: adminUser._id,
            username: adminUser.username,
            name: adminUser.name,
            nickname: adminUser.nickname,
            role: adminUser.role,
            status: adminUser.status,
            createdAt: adminUser.createdAt
        });
    } catch (error) {
        console.error('Admin creation failed:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
        }
        res.status(500).json({ message: '관리자 계정 생성에 실패했습니다.' });
    }
});

// @route   GET /api/superadmin/stats
// @desc    금일 주요 통계 조회 (신규 회원, 채널, 게시글)
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [newUsers, newChannels, newPosts, totalUsers, totalChannels, totalPosts] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: today } }),
            Channel.countDocuments({ createdAt: { $gte: today } }),
            Post.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({}),
            Channel.countDocuments({}),
            Post.countDocuments({})
        ]);

        res.json({
            today: {
                newUsers,
                newChannels,
                newPosts
            },
            total: {
                totalUsers,
                totalChannels,
                totalPosts
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/superadmin/users
// @desc    전체 사용자 목록 조회
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/superadmin/users/:id
// @desc    사용자 기본 정보 수정 (최고관리자 전용)
router.put('/users/:id', async (req, res) => {
    const { name, nickname, phone, birthdate, gender } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

        if (typeof name === 'string') {
            const trimmed = name.trim();
            if (trimmed.length < 2 || trimmed.length > 20) {
                return res.status(400).json({ message: '이름은 2자 이상 20자 이하로 입력해 주세요.' });
            }
            user.name = trimmed;
        }

        if (typeof nickname === 'string') {
            const trimmed = nickname.trim();
            if (trimmed.length > 20) {
                return res.status(400).json({ message: '닉네임은 20자 이하로 입력해 주세요.' });
            }
            user.nickname = trimmed;
        }

        if (typeof phone === 'string') {
            const trimmed = phone.trim();
            if (trimmed && !phonePattern.test(trimmed)) {
                return res.status(400).json({ message: '연락처 형식이 올바르지 않습니다.' });
            }
            user.phone = trimmed;
        }

        if (typeof birthdate === 'string') {
            const trimmed = birthdate.trim();
            if (trimmed && !birthdatePattern.test(trimmed)) {
                return res.status(400).json({ message: '생년월일 형식이 올바르지 않습니다.' });
            }
            user.birthdate = trimmed;
        }

        if (typeof gender === 'string') {
            if (!['male', 'female', 'other', 'none'].includes(gender)) {
                return res.status(400).json({ message: '성별 값이 올바르지 않습니다.' });
            }
            user.gender = gender;
        }

        await user.save();
        const result = user.toObject();
        delete result.password;

        res.json({ message: '회원 정보가 수정되었습니다.', user: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/superadmin/channels
// @desc    전체 채널 목록 및 통계 조회
router.get('/channels', async (req, res) => {
    try {
        const channels = await Channel.find({}).sort({ createdAt: -1 });

        // 각 채널별 통계 추가
        const channelStats = await Promise.all(channels.map(async (channel) => {
            const memberCount = await ChannelMember.countDocuments({ channelId: channel._id, status: 'approved' });
            const noticeCount = await Notice.countDocuments({ channelId: channel._id });
            const postCount = await Post.countDocuments({ channelId: channel._id });

            return {
                ...channel.toObject(),
                stats: {
                    memberCount,
                    noticeCount,
                    postCount
                }
            };
        }));

        res.json(channelStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/superadmin/chats/search
// @desc    채팅 내역 정밀 검색 (채널명, 유저명)
router.get('/chats/search', async (req, res) => {
    const { channelName, userName } = req.query;

    try {
        let roomsQuery = {};
        let messageQuery = {};

        if (channelName) {
            const channels = await Channel.find({ name: new RegExp(channelName, 'i') });
            roomsQuery.channelId = { $in: channels.map(c => c._id) };
        }

        // 채널 조건이 있으면 해당 채널의 룸들을 먼저 확보
        const rooms = await ChatRoom.find(roomsQuery);
        messageQuery.roomId = { $in: rooms.map(r => r._id) };

        if (userName) {
            const users = await User.find({ name: new RegExp(userName, 'i') });
            messageQuery.senderId = { $in: users.map(u => u._id) };
        }

        const messages = await Message.find(messageQuery)
            .populate('senderId', 'name username')
            .populate({
                path: 'roomId',
                populate: { path: 'channelId', select: 'name' }
            })
            .sort({ createdAt: -1 })
            .limit(100);

        // 프론트엔드 기대 형식에 맞게 변환
        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            content: msg.content,
            createdAt: msg.createdAt,
            sender: msg.senderId,
            channelId: msg.roomId?.channelId
        }));

        res.json(formattedMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/superadmin/channels/:id/messages
// @desc    특정 채널의 전체 대화 내용 조회 (모든 채팅방 통합)
router.get('/channels/:id/messages', async (req, res) => {
    try {
        const rooms = await ChatRoom.find({ channelId: req.params.id });
        const roomIds = rooms.map(r => r._id);

        const messages = await Message.find({ roomId: { $in: roomIds } })
            .populate('senderId', 'name username')
            .sort({ createdAt: 1 });

        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            content: msg.content,
            createdAt: msg.createdAt,
            sender: msg.senderId
        }));

        res.json(formattedMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/superadmin/users/:id/status
// @desc    회원 등급(상태) 변경 (활성화, 휴정, 탈퇴)
router.put('/users/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

        const prevStatus = user.status;
        user.status = status;
        await user.save();

        // 1. 관리자(Admin)인 경우 개설한 채널들에 대한 연쇄 처리
        if (user.role === 'admin' || user.role === 'superadmin') {
            if (status === 'suspended' || status === 'withdrawn') {
                // 채널 정지
                await Channel.updateMany({ ownerId: user._id }, { status: 'suspended' });
            } else if (status === 'active' && (prevStatus === 'suspended' || prevStatus === 'withdrawn')) {
                // 채널 복구
                await Channel.updateMany({ ownerId: user._id }, { status: 'active' });
            }
        }

        // 2. 모든 유저에 대해 가입된 채널(멤버십) 정기/복구 처리
        if (status === 'suspended' || status === 'withdrawn') {
            // 삭제 대신 'inactive'로 변경하여 데이터 보존
            await ChannelMember.updateMany(
                { userId: user._id, status: 'approved' },
                { status: 'inactive' }
            );
        } else if (status === 'active' && (prevStatus === 'suspended' || prevStatus === 'withdrawn')) {
            // 'inactive' 상태였던 멤버십을 다시 'approved'로 복구
            await ChannelMember.updateMany(
                { userId: user._id, status: 'inactive' },
                { status: 'approved' }
            );
        }

        res.json({ message: `사용자 상태가 ${status}로 변경되었습니다.`, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/superadmin/channels/:id/status
// @desc    채널 상태 변경 (활성화, 임시패쇄, 삭제)
router.put('/channels/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        channel.status = status;
        await channel.save();

        res.json({ message: `채널 상태가 ${status}로 변경되었습니다.`, channel });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/superadmin/channels/:id/detail
// @desc    채널 통합 상세 관리 데이터 조회 (회원, 공지, 게시글)
router.get('/channels/:id/detail', async (req, res) => {
    try {
        const [members, notices, posts] = await Promise.all([
            ChannelMember.find({ channelId: req.params.id }).populate('userId', 'name username isOnline status'),
            Notice.find({ channelId: req.params.id }).populate('authorId', 'name'),
            Post.find({ channelId: req.params.id }).populate('authorId', 'name')
        ]);

        res.json({ members, notices, posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/superadmin/posts/:id
// @desc    관리자 권한 게시글 삭제
router.delete('/posts/:id', async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/superadmin/notices/:id
// @desc    관리자 권한 공지사항 삭제
router.delete('/notices/:id', async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: '공지사항이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/superadmin/channels/:channelId/members/:userId
// @desc    관리자 권한 회원 강제 추방
router.delete('/channels/:channelId/members/:userId', async (req, res) => {
    try {
        await ChannelMember.findOneAndDelete({
            channelId: req.params.channelId,
            userId: req.params.userId
        });
        res.json({ message: '회원이 채널에서 제외되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
