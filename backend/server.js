require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const User = require('./models/User'); // User 모델 추가
const { Server } = require('socket.io');
const webpush = require('web-push');

// Web Push VAPID 설정 (키가 없으면 서버 크래시 방지)
const vapidPublic = process.env.PUBLIC_VAPID_KEY;
const vapidPrivate = process.env.PRIVATE_VAPID_KEY;
console.log(`[VAPID] Public key length: ${vapidPublic ? vapidPublic.length : 'MISSING'}, Private key length: ${vapidPrivate ? vapidPrivate.length : 'MISSING'}`);

if (vapidPublic && vapidPrivate) {
    try {
        webpush.setVapidDetails('mailto:contact@example.com', vapidPublic, vapidPrivate);
        console.log('[VAPID] VAPID keys configured successfully ✅');
    } catch (err) {
        console.error('[VAPID] Failed to set VAPID details:', err.message);
        console.error('[VAPID] ⚠️ Push notifications will NOT work until valid keys are set!');
    }
} else {
    console.warn('[VAPID] ⚠️ VAPID keys are missing! Push notifications are DISABLED.');
    console.warn('[VAPID] Set PUBLIC_VAPID_KEY and PRIVATE_VAPID_KEY in environment variables.');
}

const app = express();
const server = http.createServer(app);

// Middleware & Socket.IO Setup
const allowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    process.env.FRONTEND_URL,
    'capacitor://localhost',
    'http://localhost'
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // credentials: true일 때는 '*'를 그대로 반환하면 안 되므로, 요청 origin을 그대로 허용하는 방식 사용
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};

app.use(cors(corsOptions));

// Socket.IO Setup (먼저 초기화하여 미들웨어에서 참조 가능하게 함)
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});

const socketHandler = require('./socket/index');
socketHandler(io);
app.set('io', io);

// 소켓 IO를 요청 객체에 첨부
app.use((req, res, next) => {
    req.io = io;
    next();
});

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const noticeRoutes = require('./routes/notices');
const postRoutes = require('./routes/posts');
const channelRoutes = require('./routes/channels');
const channelMemberRoutes = require('./routes/channelMembers');
const superadminRoutes = require('./routes/superadmin');
const pollRoutes = require('./routes/polls');
const initPollReminders = require('./utils/pollReminder');

// 미들웨어 설정
app.use(express.json());
app.use(cookieParser());

// 업로드 폴더 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const pushRoutes = require('./routes/push');

// API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channel-members', channelMemberRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/polls', pollRoutes);

// 데이터베이스 연결
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat')
    .then(async () => {
        console.log('MongoDB 연결 성공');

        // 투표 리마인더 초기화
        initPollReminders(io);

        // 최고관리자 자동 생성 (Vercel 등 운영 환경 대응)
        try {
            const adminExists = await User.findOne({ username: 'admin' });
            if (!adminExists) {
                await User.create({
                    name: '최고관리자',
                    username: 'admin',
                    password: 'dkfvkrh123',
                    role: 'superadmin'
                });
                console.log('최고관리자 계정(admin)이 자동 생성되었습니다.');
            }
        } catch (adminErr) {
            console.error('최고관리자 초기화 에러:', adminErr);
        }

        // 채팅방 기존 인덱스 삭제 (중복 제약 조건 완화)
        try {
            const chatrooms = mongoose.connection.db.collection('chatrooms');
            // 이전의 엄격한 인덱스 (adminId, memberId) 삭제 시도
            // 인덱스 이름은 보통 field1_1_field2_1 형식이거나 직접 지정한 이름
            const indexes = await chatrooms.indexes();
            const oldIndex = indexes.find(idx =>
                idx.key.adminId === 1 && idx.key.memberId === 1 && Object.keys(idx.key).length === 2
            );

            if (oldIndex) {
                await chatrooms.dropIndex(oldIndex.name);
                console.log(`[Database] Old unique index '${oldIndex.name}' dropped from chatrooms.`);
            }
        } catch (idxErr) {
            console.error('[Database] Index cleanup error:', idxErr.message);
        }
    })
    .catch(err => console.error('MongoDB 연결 실패:', err));

// Routes (Placeholder)
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
