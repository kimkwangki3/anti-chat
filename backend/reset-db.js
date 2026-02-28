const mongoose = require('mongoose');
require('dotenv').config();

const resetUserCollection = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat');
        console.log('DB 연결 성공');

        try {
            await mongoose.connection.collection('users').drop();
            console.log('users 컬렉션 삭제 완료 (초기화)');
        } catch (e) {
            console.log('users 컬렉션이 이미 없거나 삭제할 수 없습니다:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('오류 발생:', error);
        process.exit(1);
    }
};

resetUserCollection();
