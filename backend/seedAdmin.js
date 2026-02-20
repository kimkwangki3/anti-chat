require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat');
        console.log('MongoDB 연결 성공');

        const adminExists = await User.findOne({ username: 'admin' });
        if (adminExists) {
            adminExists.password = 'dkfvkrh123';
            adminExists.role = 'superadmin';
            adminExists.name = '최고관리자';
            await adminExists.save();
            console.log('기존 admin 계정을 최고관리자로 업데이트했습니다.');
        } else {
            await User.create({
                name: '최고관리자',
                username: 'admin',
                password: 'dkfvkrh123',
                role: 'superadmin'
            });
            console.log('신규 최고관리자 계정(admin)을 생성했습니다.');
        }

        process.exit(0);
    } catch (error) {
        console.error('에러 발생:', error);
        process.exit(1);
    }
};

seedSuperAdmin();
