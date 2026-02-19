const mongoose = require('mongoose');

const channelMemberSchema = new mongoose.Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'kicked'],
        default: 'pending'
    },
    isChatBlocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// 동일 채널에 중복 가입 방지
channelMemberSchema.index({ channelId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChannelMember', channelMemberSchema);
