const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/notices
router.post('/', protect, admin, async (req, res) => {
    const { title, content, channelId, imageUrl } = req.body;
    try {
        if (!channelId) return res.status(400).json({ message: '채널 ID가 필요합니다.' });

        const id = await insertAndGetId(
            'INSERT INTO Notices (channelId, authorId, title, content, imageUrl) VALUES (@channelId, @authorId, @title, @content, @imageUrl)',
            { channelId, authorId: req.user.id, title, content, imageUrl: imageUrl || null }
        );

        const notice = await queryOne('SELECT * FROM Notices WHERE id = @id', { id });

        if (req.io) {
            req.io.to(`channel_${channelId}`).emit('notice_received', { ...notice, authorName: req.user.name });
        }

        res.status(201).json(notice);
    } catch (error) {
        res.status(500).json({ message: '공지사항 생성 오류' });
    }
});

// POST /api/notices/upload
router.post('/upload', protect, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'notices', resource_type: 'auto' },
            (error, result) => {
                if (error) return res.status(500).json({ message: 'Cloudinary 업로드 중 오류가 발생했습니다.', error: error.message });
                res.json({ imageUrl: result.secure_url });
            }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (error) {
        res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

// GET /api/notices/channel/:channelId
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const notices = await query(
            `SELECT n.*, u.name as authorName FROM Notices n
             JOIN Users u ON n.authorId = u.id
             WHERE n.channelId = @channelId ORDER BY n.createdAt DESC`,
            { channelId: req.params.channelId }
        );
        res.json(notices.map(n => ({ ...n, authorId: { _id: n.authorId, id: n.authorId, name: n.authorName } })));
    } catch (error) {
        res.status(500).json({ message: '공지사항 조회 오류' });
    }
});

// PATCH /api/notices/:id/read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notice = await queryOne('SELECT * FROM Notices WHERE id = @id', { id: req.params.id });
        if (!notice) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });

        const already = await queryOne('SELECT id FROM NoticeReadBy WHERE noticeId = @noticeId AND userId = @userId', { noticeId: notice.id, userId: req.user.id });
        if (!already) {
            await execute('INSERT INTO NoticeReadBy (noticeId, userId) VALUES (@noticeId, @userId)', { noticeId: notice.id, userId: req.user.id });
        }
        res.json(notice);
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// PATCH /api/notices/channel/:channelId/read-all
router.patch('/channel/:channelId/read-all', protect, async (req, res) => {
    try {
        await execute(
            `INSERT INTO NoticeReadBy (noticeId, userId)
             SELECT n.id, @userId FROM Notices n
             WHERE n.channelId = @channelId
             AND NOT EXISTS (SELECT 1 FROM NoticeReadBy WHERE noticeId = n.id AND userId = @userId)`,
            { channelId: req.params.channelId, userId: req.user.id }
        );
        res.json({ message: '모든 공지사항을 읽음 처리했습니다.' });
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// DELETE /api/notices/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const notice = await queryOne(
            `SELECT n.*, c.ownerId FROM Notices n JOIN Channels c ON n.channelId = c.id WHERE n.id = @id`,
            { id: req.params.id }
        );
        if (!notice) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
        if (notice.ownerId !== req.user.id) return res.status(401).json({ message: '권한이 없습니다.' });

        await execute('DELETE FROM Notices WHERE id = @id', { id: notice.id });
        res.json({ message: '공지사항이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '공지사항 삭제 오류' });
    }
});

// PUT /api/notices/:id — 공지 수정 (내용/제목/이미지). 채널 소유 관리자만.
router.put('/:id', protect, admin, async (req, res) => {
    const { title, content, imageUrl } = req.body;
    try {
        const notice = await queryOne(
            `SELECT n.*, c.ownerId FROM Notices n JOIN Channels c ON n.channelId = c.id WHERE n.id = @id`,
            { id: req.params.id }
        );
        if (!notice) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
        if (notice.ownerId !== req.user.id) return res.status(401).json({ message: '권한이 없습니다.' });

        const updates = [], params = { id: notice.id };
        if (typeof title === 'string') { updates.push('title=@title'); params.title = title; }
        if (typeof content === 'string') { updates.push('content=@content'); params.content = content; }
        if (imageUrl !== undefined) { updates.push('imageUrl=@imageUrl'); params.imageUrl = imageUrl || null; }
        if (!updates.length) return res.status(400).json({ message: '변경할 내용이 없습니다.' });
        await execute(`UPDATE Notices SET ${updates.join(',')} WHERE id=@id`, params);
        const updated = await queryOne('SELECT * FROM Notices WHERE id = @id', { id: notice.id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: '공지사항 수정 오류' });
    }
});

module.exports = router;
