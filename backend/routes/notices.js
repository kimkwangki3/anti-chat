const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer 설정
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage });

// @route   POST /api/notices
// @desc    공지사항 생성 (관리자 전용)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    const { title, content, channelId, imageUrl } = req.body;
    try {
        if (!channelId) {
            return res.status(400).json({ message: '채널 ID가 필요합니다.' });
        }
        const notice = await Notice.create({
            title,
            content,
            channelId,
            imageUrl,
            authorId: req.user._id
        });

        if (req.io) {
            req.io.to(`channel_${channelId}`).emit('notice_received', {
                ...notice.toObject(),
                authorName: req.user.name
            });
        }

        res.status(201).json(notice);
    } catch (error) {
        res.status(500).json({ message: '공지사항 생성 오류' });
    }
});

// @route   POST /api/notices/upload
// @desc    Upload an image for notice
// @access  Private/Admin
router.post('/upload', protect, admin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// @route   GET /api/notices/channel/:channelId
// @desc    채널별 공지사항 조회
// @access  Private
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const notices = await Notice.find({ channelId: req.params.channelId })
            .populate('authorId', 'name')
            .sort({ createdAt: -1 });
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: '공지사항 조회 오류' });
    }
});

// @route   PATCH /api/notices/:id/read
// @desc    공지사항 읽음 표시
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });

        if (!notice.readBy.includes(req.user._id)) {
            notice.readBy.push(req.user._id);
            await notice.save();
        }
        res.json(notice);
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// @route   DELETE /api/notices/:id
// @desc    공지사항 삭제 (관리자 전용)
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id).populate('channelId');
        if (!notice) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });

        // 채널 소유자이거나 관리자인지 확인
        if (notice.channelId.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: '권한이 없습니다.' });
        }

        await notice.deleteOne();
        res.json({ message: '공지사항이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '공지사항 삭제 오류' });
    }
});

module.exports = router;
