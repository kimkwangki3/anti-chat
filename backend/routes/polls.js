const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// POST /api/polls
router.post('/', protect, async (req, res) => {
    const { channelId, title, options, isMultipleSelection, isAnonymous, allowAddOption, expiresAt } = req.body;
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });

        const channelMember = await queryOne('SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId', { channelId, userId: req.user.id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId === req.user.id;
        const isSuperAdmin = req.user.role === 'superadmin';

        if (!isChannelAdmin && !isSuperAdmin) return res.status(403).json({ message: '투표 생성 권한이 없습니다.' });

        const optionsJson = JSON.stringify(options.map(opt => ({ text: opt, count: 0 })));
        const id = await insertAndGetId(
            `INSERT INTO Polls (channelId, creatorId, title, options, isMultipleSelection, isAnonymous, allowAddOption, expiresAt)
             VALUES (@channelId, @creatorId, @title, @options, @isMultipleSelection, @isAnonymous, @allowAddOption, @expiresAt)`,
            {
                channelId, creatorId: req.user.id, title,
                options: optionsJson,
                isMultipleSelection: isMultipleSelection ? 1 : 0,
                isAnonymous: isAnonymous ? 1 : 0,
                allowAddOption: allowAddOption ? 1 : 0,
                expiresAt: new Date(expiresAt)
            }
        );

        const poll = await queryOne('SELECT * FROM Polls WHERE id = @id', { id });
        const io = req.app.get('io');
        if (io) {
            io.to(`channel_${channelId}`).emit('new_poll_created', { pollId: id, channelId, title });
        }

        res.status(201).json({ ...poll, options: JSON.parse(poll.options) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/polls/:id/read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const poll = await queryOne('SELECT * FROM Polls WHERE id = @id', { id: req.params.id });
        if (!poll) return res.status(404).json({ message: '투표를 찾을 수 없습니다.' });

        const already = await queryOne('SELECT id FROM PollReadBy WHERE pollId = @pollId AND userId = @userId', { pollId: poll.id, userId: req.user.id });
        if (!already) {
            await execute('INSERT INTO PollReadBy (pollId, userId) VALUES (@pollId, @userId)', { pollId: poll.id, userId: req.user.id });
        }
        res.json({ ...poll, options: JSON.parse(poll.options) });
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// PATCH /api/polls/channel/:channelId/read-all
router.patch('/channel/:channelId/read-all', protect, async (req, res) => {
    try {
        await execute(
            `INSERT INTO PollReadBy (pollId, userId)
             SELECT p.id, @userId FROM Polls p
             WHERE p.channelId = @channelId
             AND NOT EXISTS (SELECT 1 FROM PollReadBy WHERE pollId = p.id AND userId = @userId)`,
            { channelId: req.params.channelId, userId: req.user.id }
        );
        res.json({ message: '모든 투표를 읽음 처리했습니다.' });
    } catch (error) {
        res.status(500).json({ message: '읽음 처리 오류' });
    }
});

// GET /api/polls/channel/:channelId
router.get('/channel/:channelId', protect, async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널 없음' });

        const channelMember = await queryOne('SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId', { channelId, userId: req.user.id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId === req.user.id;
        const isAdmin = isChannelAdmin || req.user.role === 'superadmin';

        const polls = await query(
            `SELECT p.*, v.selectedOptions as userVote
             FROM Polls p
             LEFT JOIN Votes v ON v.pollId = p.id AND v.userId = @userId
             WHERE p.channelId = @channelId ORDER BY p.createdAt DESC`,
            { channelId, userId: req.user.id }
        );

        res.json(polls.map(p => {
            const options = JSON.parse(p.options || '[]');
            return {
                ...p,
                options: options.map(opt => ({ ...opt, count: isAdmin ? opt.count : 0 })),
                hasVoted: !!p.userVote,
                myVote: p.userVote ? JSON.parse(p.userVote) : []
            };
        }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/polls/:id/vote
router.post('/:id/vote', protect, async (req, res) => {
    const { selectedOptions } = req.body;
    try {
        const poll = await queryOne('SELECT * FROM Polls WHERE id = @id', { id: req.params.id });
        if (!poll) return res.status(404).json({ message: '투표를 찾을 수 없습니다.' });
        if (poll.status === 'closed' || new Date() > new Date(poll.expiresAt)) {
            return res.status(400).json({ message: '종료된 투표입니다.' });
        }

        const existingVote = await queryOne('SELECT id FROM Votes WHERE pollId = @pollId AND userId = @userId', { pollId: poll.id, userId: req.user.id });
        if (existingVote) return res.status(400).json({ message: '이미 투표에 참여하셨습니다.' });

        await execute(
            'INSERT INTO Votes (pollId, userId, selectedOptions) VALUES (@pollId, @userId, @selectedOptions)',
            { pollId: poll.id, userId: req.user.id, selectedOptions: JSON.stringify(selectedOptions) }
        );

        // 득표수 업데이트
        const options = JSON.parse(poll.options || '[]');
        options.forEach(opt => {
            if (selectedOptions.includes(opt.text)) opt.count += 1;
        });
        await execute('UPDATE Polls SET options = @options WHERE id = @id', { options: JSON.stringify(options), id: poll.id });

        res.json({ message: '투표가 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/polls/:id/details
router.get('/:id/details', protect, async (req, res) => {
    try {
        const poll = await queryOne('SELECT * FROM Polls WHERE id = @id', { id: req.params.id });
        if (!poll) return res.status(404).json({ message: '투표 없음' });

        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: poll.channelId });
        const channelMember = await queryOne('SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId', { channelId: poll.channelId, userId: req.user.id });
        const isChannelAdmin = channelMember?.role === 'admin' || channel.ownerId === req.user.id;
        const isSuperAdmin = req.user.role === 'superadmin';

        if (!isChannelAdmin && !isSuperAdmin) return res.status(403).json({ message: '조회 권한이 없습니다.' });

        const votes = await query(
            `SELECT v.*, u.name, u.username FROM Votes v JOIN Users u ON v.userId = u.id WHERE v.pollId = @pollId`,
            { pollId: poll.id }
        );

        res.json({
            poll: { ...poll, options: JSON.parse(poll.options || '[]') },
            votes: poll.isAnonymous ? (isSuperAdmin ? votes.map(v => ({ ...v, selectedOptions: JSON.parse(v.selectedOptions), userId: { _id: v.userId, name: v.name, username: v.username } })) : [])
                : votes.map(v => ({ ...v, selectedOptions: JSON.parse(v.selectedOptions), userId: { _id: v.userId, name: v.name, username: v.username } }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/polls/superadmin/all
router.get('/superadmin/all', protect, superAdmin, async (req, res) => {
    try {
        const polls = await query(
            `SELECT p.*, c.name as channelName FROM Polls p JOIN Channels c ON p.channelId = c.id ORDER BY p.createdAt DESC`
        );
        res.json(polls.map(p => ({ ...p, options: JSON.parse(p.options || '[]'), channelId: { _id: p.channelId, id: p.channelId, name: p.channelName } })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
