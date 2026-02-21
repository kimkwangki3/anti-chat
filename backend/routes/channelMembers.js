const express = require('express');
const router = express.Router();
const ChannelMember = require('../models/ChannelMember');
const Channel = require('../models/Channel');
const { protect, admin } = require('../middleware/authMiddleware');
const { sendPushNotification } = require('../utils/pushService');

// @route   POST /api/channel-members/join
// @desc    채널 가입 신청
// @access  Private
router.post('/join', protect, async (req, res) => {
    const { channelId } = req.body;

    try {
        const existing = await ChannelMember.findOne({ channelId, userId: req.user._id });
        if (existing) {
            return res.status(400).json({ message: '이미 가입 신청하셨거나 멤버입니다.' });
        }

        const member = await ChannelMember.create({
            channelId,
            userId: req.user._id,
            status: 'pending'
        });

        // 채널 관리자에게 실시간 알림 emit
        const channel = await Channel.findById(channelId);
        if (channel?.ownerId) {
            req.io.to(channel.ownerId.toString()).emit('new_member_request', {
                channelId,
                channelName: channel.name,
                userId: req.user._id,
                userName: req.user.name,
                memberId: member._id
            });

            // 관리자에게 웹 푸시 발송
            await sendPushNotification(channel.ownerId, {
                title: '👥 신규 가입 신청',
                body: `${channel.name} 채널에 ${req.user.name}님이 가입을 신청했습니다.`,
                url: `/admin/members?channelId=${channelId}`,
                tag: 'member'
            });
        }

        res.status(201).json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channel-members/role/:channelId
// @desc    해당 채널에서의 유저 역할 조회
// @access  Private
router.get('/role/:channelId', protect, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ message: '채널 없음' });

        if (channel.ownerId.toString() === req.user._id.toString()) {
            return res.json({ role: 'admin', isOwner: true });
        }

        const member = await ChannelMember.findOne({
            channelId: req.params.channelId,
            userId: req.user._id
        });

        res.json({
            role: member ? member.role : 'none',
            status: member ? member.status : 'none'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channel-members/management/:channelId
// @desc    특정 채널의 멤버 관리 (관리자 전용)
// @access  Private/Admin
router.get('/management/:channelId', protect, admin, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        }
        if (channel.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '해당 채널의 관리자가 아닙니다.' });
        }

        const members = await ChannelMember.find({ channelId: req.params.channelId })
            .populate('userId', 'name username nickname gender birthdate region recommender registrationIp registrationMac isOnline');
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/channel-members/:id/status
// @desc    멤버 상태 변경 (승인/탈퇴/거부 등)
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
    const { status, isChatBlocked } = req.body;
    try {
        const member = await ChannelMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: '멤버 정보를 찾을 수 없습니다.' });

        const channel = await Channel.findById(member.channelId);
        if (!channel) return res.status(404).json({ message: '채널 정보를 찾을 수 없습니다.' });

        if (channel.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        if (status) member.status = status;
        if (typeof isChatBlocked === 'boolean') member.isChatBlocked = isChatBlocked;

        await member.save();

        // 승인 또는 거절 시 해당 멤버에게 실시간 알림 전송
        if (status === 'approved' || status === 'rejected') {
            const targetUserId = member.userId.toString();
            const channelName = channel.name;

            // 소켓 실시간 알림
            req.io.to(targetUserId).emit('member_status_updated', {
                channelId: member.channelId,
                channelName,
                status
            });

            // 웹 푸시 알림 (오프라인 사용자용)
            const pushTitle = status === 'approved' ? '✅ 채널 가입 승인' : '❌ 채널 가입 거절';
            const pushBody = status === 'approved'
                ? `${channelName} 채널 가입이 승인되었습니다! 이제 채널에 접속해보세요.`
                : `${channelName} 채널 가입이 거절되었습니다.`;

            await sendPushNotification(targetUserId, {
                title: pushTitle,
                body: pushBody,
                url: '/search-channels'
            });
        }

        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
