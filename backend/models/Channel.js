const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'deleted'],
        default: 'active'
    },
    cardColor: {
        type: String,
        default: '#4f6ef7'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Channel', channelSchema);
