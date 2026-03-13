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
const SUPERADMIN_DM_CHANNEL_NAME = '__SUPERADMIN_DM__';

const ensureSuperAdminDmChannel = async (ownerId) => {
    let channel = await Channel.findOne({ name: SUPERADMIN_DM_CHANNEL_NAME });
    if (!channel) {
        channel = await Channel.create({
            ownerId,
            name: SUPERADMIN_DM_CHANNEL_NAME,
            description: 'Superadmin direct message channel',
            cardColor: '#FF8C69',
            status: 'active'
        });
    }
    return channel;
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

// 매일 새벽 05:00 기준 시점 계산 (대화내용 노출 임계점)
const getChatThreshold = () => {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setHours(5, 0, 0, 0);

    // 현재 시간이 새벽 5시 이전이면, 임계점은 '어제 새벽 5시'
    if (now < threshold) {
        threshold.setDate(threshold.getDate() - 1);
    }
    return threshold;
};

// @route   GET /api/chat/users/:channelId
// @desc    해당 채널의 멤버 목록 조회 (관리자 전용)
// @access  Private/Admin
router.get('/users/:channelId', protect, admin, async (req, res) => {
    try {
        // 채널 멤버 중 'approved' 상태인 유저만 조회
        const members = await ChannelMember.find({
            channelId: req.params.channelId,
            status: 'approved'
        }).populate('userId', 'name username isOnline profileImage');

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
            .populate('adminId', 'name username isOnline profileImage')
            .populate('memberId', 'name username isOnline profileImage')
            .populate('channelId', 'name profileImage cardColor');

        res.status(201).json(room);
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        res.status(500).json({ message: '채팅방 생성에 실패했습니다: ' + error.message });
    }
});

// @route   GET /api/chat/rooms
// @desc    사용자의 채팅방 목록 조회 (채널별 필터링 가능)
// @access  Private
// @route   POST /api/chat/rooms/superadmin
// @desc    Superadmin direct 1:1 room create/get
// @access  Private/Superadmin
router.post('/rooms/superadmin', protect, async (req, res) => {
    const { memberId } = req.body;

    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ message: '최고관리자만 사용할 수 있습니다.' });
        }

        if (!memberId) {
            return res.status(400).json({ message: '대화할 사용자 ID가 필요합니다.' });
        }

        if (memberId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: '자기 자신과는 대화할 수 없습니다.' });
        }

        const targetUser = await User.findById(memberId).select('_id');
        if (!targetUser) {
            return res.status(404).json({ message: '대상 사용자를 찾을 수 없습니다.' });
        }

        const dmChannel = await ensureSuperAdminDmChannel(req.user._id);

        let room = await ChatRoom.findOne({
            adminId: req.user._id,
            memberId,
            channelId: dmChannel._id
        });

        const wasCreatedNow = !room;
        if (!room) {
            try {
                room = await ChatRoom.create({
                    adminId: req.user._id,
                    memberId,
                    channelId: dmChannel._id
                });
            } catch (createError) {
                // Legacy unique index(adminId+memberId)가 남아있으면 duplicate key가 날 수 있음.
                // 이 경우 기존 1:1 방을 재사용해 기능 중단을 방지한다.
                if (createError?.code === 11000) {
                    room = await ChatRoom.findOne({
                        adminId: req.user._id,
                        memberId
                    });
                } else {
                    throw createError;
                }
            }
        }

        if (!room) {
            return res.status(500).json({ message: '채팅방 생성에 실패했습니다. (기존 방 조회 실패)' });
        }

        {
            room.adminVisible = true;
            room.memberVisible = true;
            await room.save();
        }

        const populatedRoom = await ChatRoom.findById(room._id)
            .populate('adminId', 'name username isOnline profileImage role')
            .populate('memberId', 'name username isOnline profileImage role status')
            .populate('channelId', 'name profileImage cardColor');

        // 최고관리자가 새 1:1 방을 만든 순간 상대방에게 실시간으로 방 노출/알림 전달
        if (wasCreatedNow) {
            const io = req.app.get('io');
            if (io) {
                io.to(req.user._id.toString()).emit('room_updated', populatedRoom);
                io.to(memberId.toString()).emit('room_updated', populatedRoom);

                io.to(memberId.toString()).emit('chat_notification', {
                    roomId: populatedRoom._id,
                    senderName: req.user.name || req.user.username || '최고관리자',
                    content: '최고관리자가 1:1 대화를 시작했습니다.',
                    channelId: populatedRoom.channelId?._id || populatedRoom.channelId
                });
            }
        }

        res.status(200).json(populatedRoom);
    } catch (error) {
        console.error('Superadmin room create error:', error);
        res.status(500).json({ message: `최고관리자 채팅방 생성에 실패했습니다. (${error.message})` });
    }
});

router.get('/rooms', protect, async (req, res) => {
    const { channelId } = req.query;
    try {
        const isSuperAdmin = req.user.role === 'superadmin';
        const isAdmin = req.user.role === 'admin';

        const addChannelFilter = (condition) => {
            if (channelId) condition.channelId = channelId;
            return condition;
        };

        let query;

        if (isSuperAdmin) {
            query = addChannelFilter({
                adminId: req.user._id,
                adminVisible: { $ne: false }
            });
        } else if (isAdmin) {
            // 일반 채널 관리자 대화: adminId 기준
            // 최고관리자 1:1 대화: memberId 기준(채널 가입 여부와 무관하게 수신 가능)
            const dmChannel = await Channel.findOne({ name: SUPERADMIN_DM_CHANNEL_NAME }).select('_id');

            const adminOwnedCondition = addChannelFilter({
                adminId: req.user._id,
                adminVisible: { $ne: false }
            });

            const memberSideDmCondition = {
                memberId: req.user._id,
                memberVisible: { $ne: false }
            };
            if (dmChannel?._id) {
                memberSideDmCondition.channelId = dmChannel._id;
            } else {
                memberSideDmCondition.channelId = null;
            }
            if (channelId) {
                memberSideDmCondition.channelId = channelId;
            }

            query = {
                $or: [
                    adminOwnedCondition,
                    memberSideDmCondition
                ]
            };
        } else {
            query = addChannelFilter({
                memberId: req.user._id,
                memberVisible: { $ne: false }
            });
        }

        const threshold = getChatThreshold();
        const rooms = await ChatRoom.find(query)
            .populate('adminId', 'name username isOnline profileImage')
            .populate('memberId', 'name username isOnline profileImage')
            .populate('channelId', 'name profileImage cardColor')
            .sort({ lastMessageAt: -1 });

        // 마지막 메시지가 임계점(새벽 5시) 이전인 경우 프론트에 빈 값으로 전달하거나 처리
        // 클라이언트 사이드 필터링을 돕기 위해 threshold 정보를 함께 주거나, 
        // 아예 lastMessage가 threshold 이전이면 가공 처리
        const processedRooms = rooms.map(room => {
            const roomObj = room.toObject();
            if (roomObj.lastMessageAt < threshold) {
                roomObj.lastMessage = '';
                // unreadCount도 이 시점 이전 것은 무시해야 하는지 기획 확인 필요 (일단 유지)
            }
            // 수동 삭제 시점(clearedAt)도 고려하여 더 늦은 시점 적용 가능
            return roomObj;
        });

        res.json(processedRooms);
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
        const now = new Date();
        const update = {
            lastMessage: '', // 대화 미리보기 초기화
            lastMessageAt: now
        };

        if (isAdmin) {
            update.clearedAtAdmin = now;
            update.clearedAtMember = now;
        } else {
            update.clearedAtMember = now;
        }

        const room = await ChatRoom.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate('adminId', 'name username isOnline profileImage')
            .populate('memberId', 'name username isOnline profileImage')
            .populate('channelId', 'name profileImage cardColor');

        // 실시간 동기화: 해당 방에 있는 유저들에게 삭제 알림
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id).emit('messages_cleared', {
                roomId: req.params.id,
                clearedAt: now,
                updatedRoom: room
            });
        }

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
        const threshold = getChatThreshold();

        // 수동 삭제 시점(clearedAt)과 시스템 리셋 시점(05:00) 중 더 늦은 시점을 기준으로 필터링
        const effectiveThreshold = clearedAt && clearedAt > threshold ? clearedAt : threshold;

        let query = {
            roomId: req.params.id,
            createdAt: { $gt: effectiveThreshold }
        };

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
