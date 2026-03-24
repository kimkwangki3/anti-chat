const express = require('express');
const router = express.Router();
const { query, queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect, admin } = require('../middleware/authMiddleware');
const { sendPushNotification } = require('../utils/pushService');

// POST /api/channel-members/join
router.post('/join', protect, async (req, res) => {
    const { channelId } = req.body;
    try {
        const existing = await queryOne(
            'SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId',
            { channelId, userId: req.user.id }
        );

        let member;
        if (existing) {
            if (existing.status === 'withdrawn') {
                const hoursElapsed = (Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60);
                if (hoursElapsed < 48) {
                    return res.status(403).json({ message: '채널 탈퇴 후 2일(48시간) 내에는 재가입할 수 없습니다.' });
                }
                await execute(
                    'UPDATE ChannelMembers SET status=\'pending\', updatedAt=GETDATE() WHERE id=@id',
                    { id: existing.id }
                );
                member = { ...existing, status: 'pending' };
            } else {
                return res.status(400).json({ message: '이미 가입 신청하셨거나 멤버입니다.' });
            }
        } else {
            const newId = await insertAndGetId(
                'INSERT INTO ChannelMembers (channelId, userId, status) VALUES (@channelId, @userId, \'pending\')',
                { channelId, userId: req.user.id }
            );
            member = { id: newId, _id: newId, channelId, userId: req.user.id, status: 'pending' };
        }

        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (channel?.ownerId) {
            req.io.to(String(channel.ownerId)).emit('new_member_request', {
                channelId, channelName: channel.name,
                userId: req.user.id, userName: req.user.name, memberId: member.id
            });
            await sendPushNotification(channel.ownerId, {
                title: '👥 신규 가입 신청',
                body: `${channel.name} 채널에 ${req.user.name}님이 가입을 신청했습니다.`,
                url: `/admin/members?channelId=${channelId}`, tag: 'member'
            });
        }

        res.status(201).json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channel-members/role/:channelId
router.get('/role/:channelId', protect, async (req, res) => {
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: req.params.channelId });
        if (!channel) return res.status(404).json({ message: '채널 없음' });

        if (channel.ownerId === req.user.id) {
            return res.json({ role: 'admin', isOwner: true });
        }

        const member = await queryOne(
            'SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId',
            { channelId: req.params.channelId, userId: req.user.id }
        );
        res.json({ role: member ? member.role : 'none', status: member ? member.status : 'none' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/channel-members/leave
router.post('/leave', protect, async (req, res) => {
    const { channelId } = req.body;
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: channelId });
        if (!channel) return res.status(404).json({ message: '채널 정보를 찾을 수 없습니다.' });
        if (channel.ownerId === req.user.id) return res.status(400).json({ message: '채널 관리자는 채널을 탈퇴할 수 없습니다.' });

        const member = await queryOne(
            'SELECT * FROM ChannelMembers WHERE channelId = @channelId AND userId = @userId',
            { channelId, userId: req.user.id }
        );
        if (!member || member.status !== 'approved') return res.status(400).json({ message: '채널의 멤버가 아닙니다.' });

        await execute(
            'UPDATE ChannelMembers SET status=\'withdrawn\', updatedAt=GETDATE() WHERE id=@id',
            { id: member.id }
        );

        if (channel.ownerId) {
            req.io.to(String(channel.ownerId)).emit('member_left', {
                channelId, userId: req.user.id, userName: req.user.name
            });
        }

        res.json({ message: '성공적으로 채널에서 탈퇴했습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/channel-members/management/:channelId
router.get('/management/:channelId', protect, admin, async (req, res) => {
    try {
        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: req.params.channelId });
        if (!channel) return res.status(404).json({ message: '채널을 찾을 수 없습니다.' });
        if (channel.ownerId !== req.user.id) return res.status(403).json({ message: '해당 채널의 관리자가 아닙니다.' });

        const members = await query(
            `SELECT cm.*, u.id as u_id, u.name, u.username, u.nickname, u.gender, u.birthdate,
                    u.phone, u.recommender, u.registrationIp, u.registrationMac, u.isOnline
             FROM ChannelMembers cm JOIN Users u ON cm.userId = u.id
             WHERE cm.channelId = @channelId`,
            { channelId: req.params.channelId }
        );
        res.json(members.map(m => ({
            ...m, _id: m.id,
            userId: { _id: m.u_id, id: m.u_id, name: m.name, username: m.username, nickname: m.nickname, gender: m.gender, birthdate: m.birthdate, phone: m.phone, recommender: m.recommender, registrationIp: m.registrationIp, registrationMac: m.registrationMac, isOnline: m.isOnline }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/channel-members/:id/status
router.put('/:id/status', protect, admin, async (req, res) => {
    const { status, isChatBlocked } = req.body;
    try {
        const member = await queryOne('SELECT * FROM ChannelMembers WHERE id = @id', { id: req.params.id });
        if (!member) return res.status(404).json({ message: '멤버 정보를 찾을 수 없습니다.' });

        const channel = await queryOne('SELECT * FROM Channels WHERE id = @id', { id: member.channelId });
        if (!channel) return res.status(404).json({ message: '채널 정보를 찾을 수 없습니다.' });
        if (channel.ownerId !== req.user.id) return res.status(403).json({ message: '권한이 없습니다.' });

        const updates = [];
        const params = { id: member.id };
        if (status) { updates.push('status=@status'); params.status = status; }
        if (typeof isChatBlocked === 'boolean') { updates.push('isChatBlocked=@isChatBlocked'); params.isChatBlocked = isChatBlocked ? 1 : 0; }
        if (updates.length) {
            await execute(`UPDATE ChannelMembers SET ${updates.join(',')}, updatedAt=GETDATE() WHERE id=@id`, params);
        }

        if (status === 'approved' || status === 'rejected') {
            req.io.to(String(member.userId)).emit('member_status_updated', {
                channelId: member.channelId, channelName: channel.name, status
            });
            await sendPushNotification(member.userId, {
                title: status === 'approved' ? '✅ 채널 가입 승인' : '❌ 채널 가입 거절',
                body: status === 'approved'
                    ? `${channel.name} 채널 가입이 승인되었습니다! 이제 채널에 접속해보세요.`
                    : `${channel.name} 채널 가입이 거절되었습니다.`,
                url: '/search-channels'
            });
        }

        const updated = await queryOne('SELECT * FROM ChannelMembers WHERE id = @id', { id: member.id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
