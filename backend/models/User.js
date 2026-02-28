const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        trim: true
    },
    profileImage: {
        type: String,
        default: null
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'none'],
        default: 'none'
    },
    birthdate: {
        type: String // YYYY-MM-DD format
    },
    phone: {
        type: String,
        trim: true
    },
    recommender: {
        type: String,
        trim: true
    },
    registrationIp: {
        type: String
    },
    registrationMac: {
        type: String,
        default: 'N/A (Browser Restricted)'
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'member', 'withdrawn'],
        default: 'member'
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastLoginIp: {
        type: String
    },
    lastLoginAt: {
        type: Date
    },
    lastLogoutAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'withdrawn'],
        default: 'active'
    },
    currentSessionId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// 비밀번호 검증 메소드 (평문 직접 비교)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
