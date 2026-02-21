const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const ChannelMember = require('../models/ChannelMember');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier'); // npm install streamifier might be needed or use simplified approach

// Multer Storage 설정 (메모리 스토리지 사용)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

// @route   GET /api/chat/users/:channelId
// @desc    해당 채널의 멤버 목록 조회 (관리자 전용)
// @access  Private/Admin
router.get('/users/:channelId', protect, admin, async (req, res) => {
    try {
        // 채널 멤버 중 'approved' 상태인 유저만 조회
        const members = await ChannelMember.find({
            channelId: req.params.channelId,
            status: 'approved'
        }).populate('userId', 'name username isOnline');

        const users = members.map(m => m.userId);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: '멤버 목록을 불러오는데 실패했습니다.' });
    }
});

// @route   POST /api/chat/rooms
// @desc    채팅방 생성 또는 기존 방 조회
// @access  Private
router.post('/rooms', protect, async (req, res) => {
    const { memberId: requestedMemberId, channelId } = req.body;

    try {
        if (!channelId) {
            return res.status(400).json({ message: '채널 ID가 필요합니다.' });
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        }

        let adminId, memberId;

        if (req.user.role === 'admin') {
            // 관리자가 멤버에게 채팅 요청 시
            if (channel.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: '채널 관리자만 멤버에게 채팅을 시작할 수 있습니다.' });
            }
            adminId = req.user._id;
            memberId = requestedMemberId;
        } else {
            // 일반 회원이 관리자에게 채팅 요청 시
            const membership = await ChannelMember.findOne({ channelId, userId: req.user._id, status: 'approved' });
            if (!membership) {
                return res.status(403).json({ message: '해당 채널의 승인된 멤버만 관리자에게 채팅할 수 있습니다.' });
            }
            adminId = channel.ownerId;
            memberId = req.user._id;
        }

        if (!memberId || !adminId) {
            return res.status(400).json({ message: '채팅 상대 정보가 부족합니다.' });
        }

        // 기존 방 검색 (관리자 ID와 멤버 ID 쌍)
        let room = await ChatRoom.findOne({ adminId, memberId, channelId });

        if (room) {
            // 숨겨진 상태일 수 있으므로 가시성 리셋
            room.adminVisible = true;
            room.memberVisible = true;
            await room.save();
            return res.status(200).json(room);
        }

        // 새 방 생성
        room = await ChatRoom.create({
            adminId,
            memberId,
            channelId
        });

        // 생성 후 바로 사용자 정보 채우기 (프론트엔드 렌더링 오류 방지)
        room = await ChatRoom.findById(room._id)
            .populate('adminId', 'name username isOnline')
            .populate('memberId', 'name username isOnline');

        res.status(201).json(room);
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        res.status(500).json({ message: '채팅방 생성에 실패했습니다.' });
    }
});

// @route   GET /api/chat/rooms
// @desc    사용자의 채팅방 목록 조회 (채널별 필터링 가능)
// @access  Private
router.get('/rooms', protect, async (req, res) => {
    const { channelId } = req.query;
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        let query = {};
        if (isAdmin) {
            query.adminId = req.user._id;
            query.adminVisible = { $ne: false };
        } else {
            query.memberId = req.user._id;
            query.memberVisible = { $ne: false };
        }

        if (channelId) {
            query.channelId = channelId;
        }

        const rooms = await ChatRoom.find(query)
            .populate('adminId', 'name username isOnline')
            .populate('memberId', 'name username isOnline')
            .sort({ lastMessageAt: -1 });

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: '채팅방 목록을 불러오는데 실패했습니다.' });
    }
});

// @route   PUT /api/chat/rooms/:id/read
// @desc    채팅방 읽음 처리
router.put('/rooms/:id/read', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const update = isAdmin
            ? { unreadCountAdmin: 0 }
            : { unreadCountMember: 0 };

        const room = await ChatRoom.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/chat/rooms/:id/hide
// @desc    채팅방 숨기기
router.put('/rooms/:id/hide', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const update = isAdmin
            ? { adminVisible: false }
            : { memberVisible: false };

        const room = await ChatRoom.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/chat/rooms/:id/clear
// @desc    채팅방 대화내용 전체 삭제 (숨기기)
router.put('/rooms/:id/clear', protect, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const update = isAdmin
            ? { clearedAtAdmin: new Date() }
            : { clearedAtMember: new Date() };

        const room = await ChatRoom.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/chat/rooms/:id/messages
// @desc    채팅 메시지 조회 (삭제 시점 이후 메시지만)
// @access  Private
router.get('/rooms/:id/messages', protect, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: '채팅방을 찾을 수 없습니다.' });
        }

        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const clearedAt = isAdmin ? room.clearedAtAdmin : room.clearedAtMember;

        let query = { roomId: req.params.id };
        if (clearedAt) {
            query.createdAt = { $gt: clearedAt };
        }

        const messages = await Message.find(query).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: '메시지를 불러오는데 실패했습니다.' });
    }
});

// @route   POST /api/chat/upload
// @desc    채팅 파일 업로드 (Cloudinary 이용)
router.post('/upload', protect, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        }

        // Cloudinary 업로드 스트림 생성
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'chat',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary 업로드 에러:', error);
                    return res.status(500).json({ message: 'Cloudinary 업로드 중 오류가 발생했습니다.' });
                }

                // 업로드 성공 시 안전한 URL 반환
                res.json({
                    fileUrl: result.secure_url,
                    fileType: req.file.mimetype,
                    fileName: req.file.originalname,
                    size: req.file.size
                });
            }
        );

        // 버퍼를 스트림으로 변환하여 업로드
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    } catch (error) {
        console.error('파일 업로드 에러:', error);
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
