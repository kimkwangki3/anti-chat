const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const ChannelMember = require('../models/ChannelMember');

// Web Push VAPID 설정 (server.js에서 설정되지만 안전을 위해 호출 가능하게 구성)
const sendPushNotification = async (userId, payload) => {
    try {
        const sub = await PushSubscription.findOne({ userId });
        if (sub && sub.subscription) {
            await webpush.sendNotification(
                sub.subscription,
                JSON.stringify(payload)
            );
            return true;
        }
    } catch (error) {
        console.error(`[PUSH] Error sending to ${userId}:`, error.message);
        if (error.statusCode === 410) {
            await PushSubscription.deleteOne({ userId });
        }
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
