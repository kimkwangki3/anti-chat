const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    options: [{
        text: { type: String, required: true },
        count: { type: Number, default: 0 }
    }],
    isMultipleSelection: {
        type: Boolean,
        default: false
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    allowAddOption: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

module.exports = mongoose.model('Poll', pollSchema);
