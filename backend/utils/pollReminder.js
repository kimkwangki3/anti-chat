const cron = require('node-cron');
const { query } = require('../db/mssql');
const { sendPushNotification } = require('./pushService');

const initPollReminders = (io) => {
    cron.schedule('0 10 * * *', async () => {
        console.log('[CRON] Checking for unvoted polls...');
        try {
            const now = new Date();
            const activePolls = await query(
                `SELECT p.*, c.name as channelName FROM Polls p
                 JOIN Channels c ON p.channelId = c.id
                 WHERE p.status = 'active' AND p.expiresAt > @now`,
                { now }
            );

            for (const poll of activePolls) {
                const members = await query(
                    `SELECT cm.userId, u.username FROM ChannelMembers cm
                     JOIN Users u ON cm.userId = u.id
                     WHERE cm.channelId = @channelId AND cm.status = 'approved'`,
                    { channelId: poll.channelId }
                );

                const votedRows = await query(
                    'SELECT userId FROM Votes WHERE pollId = @pollId',
                    { pollId: poll.id }
                );
                const votedSet = new Set(votedRows.map(v => String(v.userId)));

                for (const member of members) {
                    if (votedSet.has(String(member.userId))) continue;

                    console.log(`[CRON] Reminding user ${member.username} about poll: ${poll.title}`);

                    io.to(String(member.userId)).emit('poll_reminder', {
                        pollId: poll.id,
                        channelId: poll.channelId,
                        title: '투표 미참여 알림',
                        message: `[${poll.channelName}] 진행 중인 투표 '${poll.title}'에 아직 참여하지 않으셨습니다. 소중한 한 표를 부탁드립니다!`
                    });

                    sendPushNotification(member.userId, {
                        title: '투표 독려 알림 🍑',
                        body: `[${poll.channelName}] 투표 '${poll.title}'에 참여해 주세요!`,
                        url: `/chat?channelId=${poll.channelId}&pollId=${poll.id}`
                    });
                }
            }
        } catch (error) {
            console.error('[CRON] Poll reminder error:', error);
        }
    });
};

module.exports = initPollReminders;
