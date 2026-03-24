const webpush = require('web-push');
const { query, execute } = require('../db/mssql');

const sendPushNotification = async (userId, payload) => {
    try {
        const subscriptions = await query('SELECT * FROM PushSubscriptions WHERE userId=@userId', { userId });
        if (!subscriptions || subscriptions.length === 0) return false;

        const results = await Promise.allSettled(
            subscriptions.map(sub => {
                const subObj = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
                return webpush.sendNotification(subObj, JSON.stringify({ ...payload, url: payload.url || '/' }))
                    .catch(async (error) => {
                        if (error.statusCode === 410 || error.statusCode === 404) {
                            await execute('DELETE FROM PushSubscriptions WHERE id=@id', { id: sub.id });
                        }
                        throw error;
                    });
            })
        );

        return results.some(r => r.status === 'fulfilled');
    } catch (error) {
        console.error(`[PUSH] Error sending to user ${userId}:`, error.message);
    }
    return false;
};

const sendPushToChannelMembers = async (channelId, senderId, payload) => {
    try {
        const members = await query(
            'SELECT * FROM ChannelMembers WHERE channelId=@channelId AND userId != @senderId AND status=\'approved\'',
            { channelId, senderId }
        );

        const augmentedPayload = {
            ...payload,
            icon: 'https://peach-chat-peach.vercel.app/icon-192.png',
            badge: 'https://peach-chat-peach.vercel.app/icon-192.png',
        };

        const pushPromises = members.map(member => sendPushNotification(member.userId, augmentedPayload));
        await Promise.allSettled(pushPromises);
    } catch (error) {
        console.error('[PUSH] Channel push error:', error);
    }
};

module.exports = {
    sendPushNotification,
    sendPushToChannelMembers
};
