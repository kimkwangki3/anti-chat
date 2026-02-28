require('dotenv').config();
const mongoose = require('mongoose');
const Notice = require('./models/Notice');
const Post = require('./models/Post');
const Poll = require('./models/Poll');
const ChatRoom = require('./models/ChatRoom');

mongoose.connect('mongodb://127.0.0.1:27017/corporate-chat').then(async () => {
    const channelId = new mongoose.Types.ObjectId('69968afd19c2b6fd6865dd67');
    const userId = new mongoose.Types.ObjectId('69a2750660a72d96f426196e');
    try {
        console.log('Testing Notice...');
        await Notice.countDocuments({ channelId, readBy: { $ne: userId } });
        console.log('Testing Post...');
        await Post.countDocuments({ channelId, readBy: { $ne: userId } });
        console.log('Testing Poll...');
        await Poll.countDocuments({ channelId, readBy: { $ne: userId } });
        console.log('Testing ChatRoom...');
        await ChatRoom.find({ channelId, $or: [{ adminId: userId }, { memberId: userId }] });
        console.log('All tests passed.');
    } catch (err) {
        console.error('Failed with error:', err.message);
    }
    process.exit(0);
});
