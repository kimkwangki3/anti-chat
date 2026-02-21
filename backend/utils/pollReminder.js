const cron = require('node-cron');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const ChannelMember = require('../models/ChannelMember');
const { sendPushNotification } = require('./pushService');

const initPollReminders = (io) => {
    // 매일 오전 10시에 실행 (0 10 * * *)
    // 테스트를 위해 1분마다 실행하려면 (* * * * *)
    cron.schedule('0 10 * * *', async () => {
        console.log('[CRON] Checking for unvoted polls...');
        try {
            const now = new Date();
            const activePolls = await Poll.find({
                status: 'active',
                expiresAt: { $gt: now }
            }).populate('channelId', 'name');

            for (const poll of activePolls) {
                // 1. 해당 채널의 모든 승인된 멤버 찾기
                const members = await ChannelMember.find({
                    channelId: poll.channelId._id,
                    status: 'approved'
                }).populate('userId');

                // 2. 이미 투표한 멤버 ID 목록
                const votedUserIds = await Vote.find({ pollId: poll._id }).distinct('userId');
                const votedSet = new Set(votedUserIds.map(id => id.toString()));

                // 3. 투표하지 않은 멤버에게 알림 발송
                for (const member of members) {
                    if (!member.userId) continue;
                    const userIdStr = member.userId._id.toString();

                    if (!votedSet.has(userIdStr)) {
                        console.log(`[CRON] Reminding user ${member.userId.username} about poll: ${poll.title}`);

                        // 소켓 알림 (로그인 중인 경우)
                        io.to(userIdStr).emit('poll_reminder', {
                            pollId: poll._id,
                            channelId: poll.channelId._id,
                            title: '투표 미참여 알림',
                            message: `[${poll.channelId.name}] 진행 중인 투표 '${poll.title}'에 아직 참여하지 않으셨습니다. 소중한 한 표를 부탁드립니다!`
                        });

                        // 푸시 알림 (PWA/백그라운드)
                        sendPushNotification(member.userId._id, {
                            title: '투표 독려 알림 🍑',
                            body: `[${poll.channelId.name}] 투표 '${poll.title}'에 참여해 주세요!`,
                            data: {
                                url: `/chat?channelId=${poll.channelId._id}&pollId=${poll._id}` // 투표 탭으로 이동하게끔 추후 유도
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Poll reminder error:', error);
        }
    });
};

module.exports = initPollReminders;
