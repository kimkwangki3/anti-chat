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

// @route   GET /api/superadmin/stats
// @desc    금일 주요 통계 조회 (신규 회원, 채널, 게시글)
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [newUsers, newChannels, newPosts] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: today } }),
            Channel.countDocuments({ createdAt: { $gte: today } }),
            Post.countDocuments({ createdAt: { $gte: today } })
        ]);

        res.json({
            today: {
                newUsers,
                newChannels,
                newPosts
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

module.exports = router;
