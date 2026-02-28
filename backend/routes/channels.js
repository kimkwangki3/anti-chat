const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const ChannelMember = require('../models/ChannelMember');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Multer 설정 (메모리 스토리지)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
});

// @route   POST /api/channels
// @desc    채널 생성 (관리자 전용)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, description } = req.body;

    try {
        const ownedChannelsCount = await Channel.countDocuments({ ownerId: req.user._id });
        if (ownedChannelsCount >= 4) {
            return res.status(400).json({ message: '관리자는 최대 4개의 채널까지 개설할 수 있습니다.' });
        }

        const channelExists = await Channel.findOne({ name });
        if (channelExists) {
            return res.status(400).json({ message: '이미 존재하는 채널 이름입니다.' });
        }

        const channel = await Channel.create({
            ownerId: req.user._id,
            name,
            description
        });

        // 생성한 관리자는 자동으로 approved 멤버로 등록
        await ChannelMember.create({
            channelId: channel._id,
            userId: req.user._id,
            status: 'approved'
        });

        // 관리자 대화명 자동 변경: 채널명과 동일하게
        await User.findByIdAndUpdate(req.user._id, { name: name });

        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channels/search
// @desc    채널 검색
// @access  Private
router.get('/search', protect, async (req, res) => {
    const { q } = req.query;
    try {
        const query = {
            name: { $regex: q || '', $options: 'i' },
            status: 'active' // 활성화된 채널만 검색 허용
        };
        const channels = await Channel.find(query).populate('ownerId', 'name username');
        res.json(channels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channels/my-channels
// @desc    내가 가입했거나 관리하는 채널 목록
// @access  Private
router.get('/my-channels', protect, async (req, res) => {
    try {
        const memberships = await ChannelMember.find({ userId: req.user._id })
            .populate({
                path: 'channelId',
                match: { status: 'active' }, // 활성화된 채널만 매칭
                populate: { path: 'ownerId', select: 'name username isOnline' }
            });

        // channelId가 null인 것(비활성화된 채널)과 membership 상태가 'approved'가 아닌 것 제외
        const activeMemberships = memberships.filter(m => m.channelId !== null && m.status === 'approved');
        res.json(activeMemberships);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channels/unread-counts
// @desc    모든 채널의 읽지 않은 소식(공지, 게시글, 채팅, 투표) 개수 조회
// @access  Private
router.get('/unread-counts', protect, async (req, res) => {
    try {
        console.log('[Unread API] Starting query for user:', req.user._id);
        const userId = req.user._id;

        console.log('[Unread API] Fetching memberships...');
        const memberships = await ChannelMember.find({ userId });
        console.log('[Unread API] Fetched memberships:', memberships.length);

        const channelIds = memberships
            .filter(m => {
                const hasChannel = m.status === 'approved' && m.channelId;
                return hasChannel;
            })
            .map(m => {
                if (m.channelId._id) return m.channelId._id.toString();
                return m.channelId.toString();
            });

        console.log(`[Unread API] User ${userId} active channels: ${channelIds.length}`);

        const counts = {};

        for (const channelId of channelIds) {
            try {
                const validChannelId = new mongoose.Types.ObjectId(channelId);
                const validUserId = new mongoose.Types.ObjectId(userId);

                // 1. 공지사항 안 읽은 개수
                const noticeCount = await Notice.countDocuments({
                    channelId: validChannelId,
                    readBy: { $ne: validUserId }
                });

                // 2. 게시글 안 읽은 개수
                const postCount = await Post.countDocuments({
                    channelId: validChannelId,
                    readBy: { $ne: validUserId }
                });

                // 3. 투표 안 읽은 개수
                const pollCount = await Poll.countDocuments({
                    channelId: validChannelId,
                    status: 'active',
                    expiresAt: { $gt: new Date() },
                    readBy: { $ne: validUserId }
                });

                // 4. 채팅 안 읽은 개수
                let chatCount = 0;
                const chatRooms = await ChatRoom.find({
                    channelId: validChannelId,
                    $or: [{ adminId: validUserId }, { memberId: validUserId }]
                });

                chatRooms.forEach(room => {
                    const isRoomAdmin = room.adminId?.toString() === userId.toString();
                    if (isRoomAdmin) {
                        chatCount += (room.unreadCountAdmin || 0);
                    } else {
                        chatCount += (room.unreadCountMember || 0);
                    }
                });

                counts[channelId.toString()] = {
                    notice: noticeCount,
                    post: postCount,
                    poll: pollCount,
                    chat: chatCount
                };
                console.log(`[Unread API] Channel ${channelId}: notice=${noticeCount}, post=${postCount}, poll=${pollCount}, chat=${chatCount}`);
            } catch (err) {
                console.error(`[Unread API] Error processing channel ${channelId}:`, err.message);
                // 해당 채널 계산을 건너뛰고 나머지 채널 계속 진행
                continue;
            }
        }

        res.json(counts);
    } catch (error) {
        console.error('Unread counts fetch error:', error);
        res.status(500).json({ message: '알림 정보를 불러오는데 실패했습니다.' });
    }
});


// @route   GET /api/channels/:id
// @desc    특정 채널 상세 정보 조회
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id).populate('ownerId', 'name username');
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        // 정지된 채널은 최고관리자만 접근 가능하도록 제한 (또는 소유자)
        if (channel.status === 'suspended' && req.user.role !== 'superadmin' && channel.ownerId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '이 채널은 현재 정지된 상태입니다.' });
        }

        res.json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/channels/:id
// @desc    채널 정보 수정 (소유자 전용)
// @access  Private
router.put('/:id', protect, async (req, res) => {
    const { name, description, profileImage, cardColor } = req.body;

    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        // 소유자 확인
        if (channel.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: '채널 정보를 수정할 권한이 없습니다.' });
        }

        channel.name = name || channel.name;
        channel.description = description || channel.description;
        channel.profileImage = profileImage !== undefined ? profileImage : channel.profileImage;
        channel.cardColor = cardColor || channel.cardColor;

        const updatedChannel = await channel.save();
        res.json(updatedChannel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/channels/upload
// @desc    채널 아이콘 업로드 (Cloudinary)
// @access  Private
router.post('/upload', protect, upload.single('file'), (req, res) => {
    try {
        console.log('[Channel Upload] Request received.');
        if (!req.file) {
            console.warn('[Channel Upload] No file received in request.');
            return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        }
        console.log('[Channel Upload] File received:', req.file.originalname, 'Size:', req.file.size);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'channel_icons',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error('[Channel Upload] Cloudinary upload error:', error);
                    return res.status(500).json({
                        message: 'Cloudinary 업로드 중 오류가 발생했습니다.',
                        error: error.message
                    });
                }
                console.log('[Channel Upload] Cloudinary upload success:', result.secure_url);
                res.json({ imageUrl: result.secure_url });
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (error) {
        console.error('[Channel Upload] Global exception:', error);
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

const Notice = require('../models/Notice');
const Post = require('../models/Post');
const ChatRoom = require('../models/ChatRoom');
const Poll = require('../models/Poll');

module.exports = router;
