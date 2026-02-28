const mongoose = require('mongoose');
require('dotenv').config();

const dropEmailIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat');
        console.log('DB 연결 성공');

        const User = mongoose.connection.collection('users');
        // email_1 인덱스 삭제 시도
        try {
            await User.dropIndex('email_1');
            console.log('email_1 인덱스 삭제 완료');
        } catch (e) {
            console.log('email_1 인덱스가 이미 없거나 삭제할 수 없습니다:', e.message);
        }

        // 전체 컬렉션 클린업 (선택사항: 만약 데이터가 중요하지 않다면 아예 drop 하는게 가장 확실함)
        // await User.drop(); 

        process.exit(0);
    } catch (error) {
        console.error('오류 발생:', error);
        process.exit(1);
    }
};

dropEmailIndex();
