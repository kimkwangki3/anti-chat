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
    }
}, {
    timestamps: true
});

// 비밀번호 저장 미들웨어 (암호화 해제)
userSchema.pre('save', async function () {
    // 해싱 과정을 생략하고 바로 저장되도록 함
    return;
});

// 비밀번호 검증 메소드 (평문 직접 비교)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
