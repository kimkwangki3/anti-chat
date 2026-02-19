const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const ChannelMember = require('../models/ChannelMember');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   POST /api/channels
// @desc    채널 생성 (관리자 전용)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, description } = req.body;

    try {
        const alreadyOwner = await Channel.findOne({ ownerId: req.user._id });
        if (alreadyOwner) {
            return res.status(400).json({ message: '관리자는 한 개의 채널만 개설할 수 있습니다.' });
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
        const channels = await Channel.find({
            name: { $regex: q || '', $options: 'i' }
        }).populate('ownerId', 'name username');
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
                populate: { path: 'ownerId', select: 'name username isOnline' }
            });
        res.json(memberships);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/channels/:id
// @desc    특정 채널 상세 정보 조회
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id).populate('ownerId', 'name username');
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        res.json(channel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/channels/:id
// @desc    채널 정보 수정 (소유자 전용)
// @access  Private
router.put('/:id', protect, async (req, res) => {
    const { name, description } = req.body;

    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        // 소유자 확인
        if (channel.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: '채널 정보를 수정할 권한이 없습니다.' });
        }

        channel.name = name || channel.name;
        channel.description = description || channel.description;

        const updatedChannel = await channel.save();
        res.json(updatedChannel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
