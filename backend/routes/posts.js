const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect, admin } = require('../middleware/authMiddleware');
const { sendPushToChannelMembers } = require('../utils/pushService');

// @route   POST /api/posts
// @desc    Create a post (Admin only)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    const { title, content, channelId } = req.body;

    try {
        if (!channelId) return res.status(400).json({ message: '채널 ID가 필요합니다.' });

        const post = await Post.create({
            authorId: req.user._id,
            channelId,
            title,
            content
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

// @route   GET /api/posts/:id
// @desc    Get post details
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('authorId', 'name')
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
