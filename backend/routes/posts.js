const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const { sendPushToChannelMembers } = require('../utils/pushService');
const { normalizeUploadedFileName } = require('../utils/filename');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const postFileUploadMiddleware = (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
        if (err) return res.status(400).json({ message: '파일 업로드에 실패했습니다.', detail: err.message });
        next();
    });
};

const savePostFileLocally = async (req, file) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'posts');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const normalizedOriginalName = normalizeUploadedFileName(file.originalname || 'file');
    const ext = path.extname(normalizedOriginalName || '');
    const safeBase = path.basename(normalizedOriginalName || 'file', ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const fileName = `post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeBase}${ext}`;
    await fs.promises.writeFile(path.join(uploadDir, fileName), file.buffer);
    const host = req.get('host') || '127.0.0.1:5000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${protocol}://${host}/uploads/posts/${fileName}`;
};

// POST /api/posts
router.post('/', protect, admin, postFileUploadMiddleware, async (req, res) => {
    const { title, content, channelId } = req.body;
    try {
        if (!channelId) return res.status(400).json({ message: '채널 ID가 필요합니다.' });

        const attachments = [];
        if (Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const normalizedName = normalizeUploadedFileName(file.originalname || 'file');
                const fileUrl = await savePostFileLocally(req, file);
                attachments.push({ fileName: normalizedName, fileUrl, mimeType: file.mimetype || '', size: file.size || 0 });
            }
        }

        const id = await insertAndGetId(
            'INSERT INTO Posts (authorId, channelId, title, content, attachments) VALUES (@authorId, @channelId, @title, @content, @attachments)',
            { authorId: req.user.id, channelId, title, content, attachments: JSON.stringify(attachments) }
        );

        const post = await queryOne('SELECT p.*, u.name as authorName FROM Posts p JOIN Users u ON p.authorId = u.id WHERE p.id = @id', { id });

        if (req.io) {
            req.io.to(`channel_${channelId}`).emit('post_received', { ...post, authorName: req.user.name });
        }

        await sendPushToChannelMembers(channelId, req.user.id, {
            title: `📋 새 게시글: ${title}`,
            body: '채널에 새로운 게시글이 올라왔습니다.',
            url: `/board?channelId=${channelId}`, tag: 'post'
        });

        res.status(201).json({ ...post, attachments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/posts/upload-image — 게시글 본문 인라인 이미지 업로드 (cloudinary). 관리자만.
router.post('/upload-image', protect, admin, imageUpload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '이미지가 없습니다.' });
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'posts', resource_type: 'image' },
            (error, result) => {
                if (error) return res.status(500).json({ message: '이미지 업로드에 실패했습니다.', detail: error.message });
                res.json({ imageUrl: result.secure_url });
            }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
    } catch (e) {
        res.status(500).json({ message: '이미지 업로드 오류' });
    }
});

// GET /api/posts/channel/:channelId
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const posts = await query(
            `SELECT p.*, u.name as authorName FROM Posts p
             JOIN Users u ON p.authorId = u.id
             WHERE p.channelId = @channelId ORDER BY p.createdAt DESC`,
            { channelId: req.params.channelId }
        );
        res.json(posts.map(p => ({
            ...p,
            attachments: p.attachments ? JSON.parse(p.attachments) : [],
            authorId: { _id: p.authorId, id: p.authorId, name: p.authorName }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/posts/:id/read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const post = await queryOne('SELECT * FROM Posts WHERE id = @id', { id: req.params.id });
        if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

        const already = await queryOne('SELECT id FROM PostReadBy WHERE postId = @postId AND userId = @userId', { postId: post.id, userId: req.user.id });
        if (!already) {
            await execute('INSERT INTO PostReadBy (postId, userId) VALUES (@postId, @userId)', { postId: post.id, userId: req.user.id });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// PATCH /api/posts/channel/:channelId/read-all
router.patch('/channel/:channelId/read-all', protect, async (req, res) => {
    try {
        await execute(
            `INSERT INTO PostReadBy (postId, userId)
             SELECT p.id, @userId FROM Posts p
             WHERE p.channelId = @channelId
             AND NOT EXISTS (SELECT 1 FROM PostReadBy WHERE postId = p.id AND userId = @userId)`,
            { channelId: req.params.channelId, userId: req.user.id }
        );
        res.json({ message: '모든 게시글을 읽음 처리했습니다.' });
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// GET /api/posts/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const post = await queryOne(
            `SELECT p.*, u.name as authorName, c.name as channelName, c.cardColor
             FROM Posts p JOIN Users u ON p.authorId = u.id JOIN Channels c ON p.channelId = c.id
             WHERE p.id = @id`,
            { id: req.params.id }
        );
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comments = await query(
            `SELECT pc.*, u.name as authorName FROM PostComments pc
             JOIN Users u ON pc.authorId = u.id WHERE pc.postId = @postId ORDER BY pc.createdAt ASC`,
            { postId: post.id }
        );

        res.json({
            ...post,
            attachments: post.attachments ? JSON.parse(post.attachments) : [],
            authorId: { _id: post.authorId, id: post.authorId, name: post.authorName },
            channelId: { _id: post.channelId, id: post.channelId, name: post.channelName, cardColor: post.cardColor },
            comments: comments.map(c => ({ ...c, authorId: { _id: c.authorId, id: c.authorId, name: c.authorName } }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
    const { content } = req.body;
    try {
        const post = await queryOne('SELECT id FROM Posts WHERE id = @id', { id: req.params.id });
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const commentId = await insertAndGetId(
            'INSERT INTO PostComments (postId, authorId, content) VALUES (@postId, @authorId, @content)',
            { postId: post.id, authorId: req.user.id, content }
        );

        const comment = await queryOne(
            'SELECT pc.*, u.name as authorName FROM PostComments pc JOIN Users u ON pc.authorId = u.id WHERE pc.id = @id',
            { id: commentId }
        );
        res.status(201).json({ ...comment, authorId: { _id: comment.authorId, id: comment.authorId, name: comment.authorName } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await queryOne('SELECT * FROM Posts WHERE id = @id', { id: req.params.id });
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.authorId !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await execute('DELETE FROM Posts WHERE id = @id', { id: post.id });
        res.json({ message: 'Post removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/posts/:id — 게시글 수정 (제목/내용). 작성자 또는 관리자만.
router.put('/:id', protect, admin, async (req, res) => {
    const { title, content } = req.body;
    try {
        const post = await queryOne('SELECT * FROM Posts WHERE id = @id', { id: req.params.id });
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.authorId !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const updates = [], params = { id: post.id };
        if (typeof title === 'string' && title.trim()) { updates.push('title=@title'); params.title = title.trim(); }
        if (typeof content === 'string') { updates.push('content=@content'); params.content = content; }
        if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });
        await execute(`UPDATE Posts SET ${updates.join(',')} WHERE id=@id`, params);
        const updated = await queryOne('SELECT p.*, u.name as authorName FROM Posts p JOIN Users u ON p.authorId = u.id WHERE p.id = @id', { id: post.id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
