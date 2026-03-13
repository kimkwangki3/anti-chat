const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Post = require('../models/Post');
const { protect, admin } = require('../middleware/authMiddleware');
const { sendPushToChannelMembers } = require('../utils/pushService');
const { normalizeUploadedFileName } = require('../utils/filename');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});

const postFileUploadMiddleware = (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                message: '파일 업로드에 실패했습니다.',
                detail: err.message
            });
        }
        next();
    });
};

const savePostFileLocally = async (req, file) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'posts');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const normalizedOriginalName = normalizeUploadedFileName(file.originalname || 'file');
    const ext = path.extname(normalizedOriginalName || '');
    const safeBase = path
        .basename(normalizedOriginalName || 'file', ext)
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 80);
    const fileName = `post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeBase}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);

    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/posts/${fileName}`;
};

// @route   POST /api/posts
// @desc    Create a post (Admin only)
// @access  Private/Admin
router.post('/', protect, admin, postFileUploadMiddleware, async (req, res) => {
    const { title, content, channelId } = req.body;

    try {
        if (!channelId) return res.status(400).json({ message: '채널 ID가 필요합니다.' });

        const attachments = [];
        if (Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const normalizedOriginalName = normalizeUploadedFileName(file.originalname || 'file');
                const fileUrl = await savePostFileLocally(req, file);
                attachments.push({
                    fileName: normalizedOriginalName,
                    fileUrl,
                    mimeType: file.mimetype || '',
                    size: file.size || 0
                });
            }
        }

        const post = await Post.create({
            authorId: req.user._id,
            channelId,
            title,
            content,
            attachments
        });

        if (req.io) {
            req.io.to(`channel_${channelId}`).emit('post_received', {
                ...post.toObject(),
                authorName: req.user.name
            });
        }

        // 게시글 웹 푸시 발송
        await sendPushToChannelMembers(channelId, req.user._id, {
            title: `📋 새 게시글: ${title}`,
            body: '채널에 새로운 게시글이 올라왔습니다.',
            url: `/board?channelId=${channelId}`,
            tag: 'post'
        });

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/posts/channel/:channelId
// @desc    Get all posts for a channel
// @access  Private
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const posts = await Post.find({ channelId: req.params.channelId })
            .populate('authorId', 'name')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/posts/:id/read
// @desc    게시글 읽음 처리
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

        if (!post.readBy.includes(req.user._id)) {
            post.readBy.push(req.user._id);
            await post.save();
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// @route   PATCH /api/posts/channel/:channelId/read-all
// @desc    채널 내 모든 게시글 읽음 처리
// @access  Private
router.patch('/channel/:channelId/read-all', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const channelId = req.params.channelId;

        await Post.updateMany(
            { channelId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.json({ message: '모든 게시글을 읽음 처리했습니다.' });
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// @route   GET /api/posts/:id
// @desc    Get post details
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('authorId', 'name')
            .populate('channelId', 'name cardColor')
            .populate('comments.authorId', 'name');

        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/posts/:id/comments
// @desc    Add comment to post
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
    const { content } = req.body;

    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.comments.push({
            authorId: req.user._id,
            content
        });

        await post.save();
        res.status(201).json(post.comments[post.comments.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete post (Owner or Admin)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await post.deleteOne();
        res.json({ message: 'Post removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
