const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Multer 설정 (메모리 스토리지 사용)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

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
// @desc    Upload an image for notice (Cloudinary 이용)
// @access  Private
router.post('/upload', protect, upload.single('image'), (req, res) => {
    try {
        console.log('[Notice Upload] File received:', req.file ? req.file.originalname : 'NONE');
        if (!req.file) {
            return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        }

        // Cloudinary 업로드 스트림 생성
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'notices',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary 업로드 에러:', error);
                    return res.status(500).json({
                        message: 'Cloudinary 업로드 중 오류가 발생했습니다.',
                        error: error.message
                    });
                }

                // 업로드 성공 시 안전한 URL 반환
                res.json({ imageUrl: result.secure_url });
            }
        );

        // 버퍼를 스트림으로 변환하여 업로드
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    } catch (error) {
        console.error('파일 업로드 에러:', error);
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
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
