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

// 비밀번호 저장 미들웨어 (현재 평문 직접 비교 방식을 사용 중이므로 단순화)
userSchema.pre('save', function (next) {
    next();
});

// 비밀번호 검증 메소드 (평문 직접 비교)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
