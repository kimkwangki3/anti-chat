const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    pollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    selectedOptions: [{
        type: String,
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 한 사용자가 한 투표에 한 번만 참여할 수 있도록 인덱스 설정
voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
