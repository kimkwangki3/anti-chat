const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadCountAdmin: {
        type: Number,
        default: 0
    },
    unreadCountMember: {
        type: Number,
        default: 0
    },
    adminVisible: {
        type: Boolean,
        default: true
    },
    memberVisible: {
        type: Boolean,
        default: true
    },
    clearedAtAdmin: {
        type: Date,
        default: null
    },
    clearedAtMember: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Ensure only one room exists between an admin and a member
chatRoomSchema.index({ adminId: 1, memberId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
