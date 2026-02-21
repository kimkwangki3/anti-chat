const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: function () {
            return !this.fileUrl; // 파일이 없으면 텍스트 필수
        }
    },
    fileUrl: {
        type: String,
        required: false
    },
    fileType: {
        type: String,
        required: false
    },
    fileName: {
        type: String,
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
