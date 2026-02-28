require('dotenv').config();
const mongoose = require('mongoose');
const Notice = require('./models/Notice');
const Post = require('./models/Post');
const User = require('./models/User');
const ChannelMember = require('./models/ChannelMember');

async function testCounts() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/corporate-chat');
        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            console.log(`\n--- User: ${user.username} (${user._id}) ---`);
            const memberships = await ChannelMember.find({ userId: user._id, status: 'approved' });
            console.log(`Memberships: ${memberships.length}`);

            for (const m of memberships) {
                const noticeCount = await Notice.countDocuments({
                    channelId: m.channelId,
                    readBy: { $ne: user._id }
                });
                const postCount = await Post.countDocuments({
                    channelId: m.channelId,
                    readBy: { $ne: user._id }
                });
                console.log(`  Channel ${m.channelId}: ${noticeCount} unread notices, ${postCount} unread posts`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}
testCounts();
