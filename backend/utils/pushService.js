const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const ChannelMember = require('../models/ChannelMember');

// Web Push VAPID 설정 (server.js에서 설정되지만 안전을 위해 호출 가능하게 구성)
const sendPushNotification = async (userId, payload) => {
    try {
        const subscriptions = await PushSubscription.find({ userId });
        if (!subscriptions || subscriptions.length === 0) return false;

        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webpush.sendNotification(sub.subscription, JSON.stringify(payload))
                    .catch(async (error) => {
                        if (error.statusCode === 410 || error.statusCode === 404) {
                            await PushSubscription.deleteOne({ _id: sub._id });
                        }
                        throw error;
                    })
            )
        );

        return results.some(r => r.status === 'fulfilled');
    } catch (error) {
        console.error(`[PUSH] Error sending to user ${userId}:`, error.message);
    }
    return false;
};

/**
 * 특정 채널의 모든 멤버(발신자 제외)에게 푸시 알림 발송
 */
const sendPushToChannelMembers = async (channelId, senderId, payload) => {
    try {
        const members = await ChannelMember.find({
            channelId,
            userId: { $ne: senderId },
            status: 'approved'
        });

        const pushPromises = members.map(member => sendPushNotification(member.userId, payload));
        await Promise.allSettled(pushPromises);
    } catch (error) {
        console.error('[PUSH] Channel push error:', error);
    }
};

module.exports = {
    sendPushNotification,
    sendPushToChannelMembers
};
