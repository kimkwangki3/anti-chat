const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const ChannelMember = require('../models/ChannelMember');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');

const Channel = require('../models/Channel');

// @desc    투표 생성 (채널 관리자/최고관리자 가능)
// @route   POST /api/polls
router.post('/', protect, async (req, res) => {
    const { channelId, title, options, isMultipleSelection, isAnonymous, allowAddOption, expiresAt } = req.body;

    try {
        // 권한 체크: 최고관리자이거나 해당 채널의 관리자(멤버 테이블 또는 소유자)여부 확인
        const channel = await Channel.findById(channelId);
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        const channelMember = await ChannelMember.findOne({ channelId, userId: req.user._id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId.toString() === req.user._id.toString();
        const isSuperAdmin = req.user.role === 'superadmin';

        if (!isChannelAdmin && !isSuperAdmin) {
            return res.status(403).json({ message: '투표 생성 권한이 없습니다.' });
        }

        const poll = await Poll.create({
            channelId,
            creatorId: req.user._id,
            title,
            options: options.map(opt => ({ text: opt, count: 0 })),
            isMultipleSelection,
            isAnonymous,
            allowAddOption,
            expiresAt: new Date(expiresAt)
        });

        // 소켓 알림 발송을 위해 소켓 인스턴스 가져오기 (server.js에서 설정된 io)
        const io = req.app.get('io');
        if (io) {
            io.to(channelId).emit('new_poll_created', {
                pollId: poll._id,
                channelId,
                title: poll.title
            });
        }

        res.status(201).json(poll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    채널별 투표 목록 조회 (참여 여부 및 권한에 따른 결과 마스킹)
// @route   GET /api/polls/channel/:channelId
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const channel = await Channel.findById(channelId);
        if (!channel) return res.status(404).json({ message: '채널 없음' });

        // 권한 체크
        const channelMember = await ChannelMember.findOne({ channelId, userId: req.user._id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId.toString() === req.user._id.toString();
        const isSuperAdmin = req.user.role === 'superadmin';
        const isAdmin = isChannelAdmin || isSuperAdmin;

        const polls = await Poll.find({ channelId }).sort({ createdAt: -1 });

        const pollsWithUserStatus = await Promise.all(polls.map(async (poll) => {
            const vote = await Vote.findOne({ pollId: poll._id, userId: req.user._id });

            // 일반 멤버는 결과(count)를 볼 수 없어야 함
            const sanitizedOptions = poll.options.map(opt => ({
                ...opt.toObject(),
                count: isAdmin ? opt.count : 0 // 관리자가 아니면 0으로 마스킹
            }));

            return {
                ...poll.toObject(),
                options: sanitizedOptions,
                hasVoted: !!vote,
                myVote: vote ? vote.selectedOptions : []
            };
        }));

        res.json(pollsWithUserStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    투표하기
// @route   POST /api/polls/:id/vote
router.post('/:id/vote', protect, async (req, res) => {
    const { selectedOptions } = req.body;

    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ message: '투표를 찾을 수 없습니다.' });
        if (poll.status === 'closed' || new Date() > poll.expiresAt) {
            return res.status(400).json({ message: '종료된 투표입니다.' });
        }

        // 이미 투표했는지 확인
        const existingVote = await Vote.findOne({ pollId: poll._id, userId: req.user._id });
        if (existingVote) return res.status(400).json({ message: '이미 투표에 참여하셨습니다.' });

        // 투표 기록 저장
        await Vote.create({
            pollId: poll._id,
            userId: req.user._id,
            selectedOptions
        });

        // 득표수 업데이트
        poll.options.forEach(opt => {
            if (selectedOptions.includes(opt.text)) {
                opt.count += 1;
            }
        });
        await poll.save();

        res.json({ message: '투표가 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    투표 결과 및 상세 정보 (엑셀용 데이터 포함, 관리자 전용)
// @route   GET /api/polls/:id/details
router.get('/:id/details', protect, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ message: '투표 없음' });

        // 권한 체크: 채널 관리자인지 확인
        const channel = await Channel.findById(poll.channelId);
        const channelMember = await ChannelMember.findOne({ channelId: poll.channelId, userId: req.user._id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId.toString() === req.user._id.toString();
        const isSuperAdmin = req.user.role === 'superadmin';

        if (!isChannelAdmin && !isSuperAdmin) {
            return res.status(403).json({ message: '조회 권한이 없습니다.' });
        }

        const votes = await Vote.find({ pollId: req.params.id }).populate('userId', 'name username');

        res.json({
            poll,
            votes: poll.isAnonymous ? (isSuperAdmin ? votes : []) : votes // 익명이면 투표자 명단 제외 (슈퍼어드민은 감사용으로 확인 가능할 수도 있으나 기본은 빈 배열)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    최고관리자용 전체 투표 조회
// @route   GET /api/polls/superadmin/all
router.get('/superadmin/all', protect, superAdmin, async (req, res) => {
    try {
        const polls = await Poll.find().populate('channelId', 'name').sort({ createdAt: -1 });
        res.json(polls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
