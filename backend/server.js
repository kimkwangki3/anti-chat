require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const { Server } = require('socket.io');
const webpush = require('web-push');

// Web Push VAPID 설정
const vapidPublic = process.env.PUBLIC_VAPID_KEY;
const vapidPrivate = process.env.PRIVATE_VAPID_KEY;

if (vapidPublic && vapidPrivate) {
    try {
        webpush.setVapidDetails('mailto:contact@example.com', vapidPublic, vapidPrivate);
    } catch (err) {
        console.error('[VAPID] Failed:', err.message);
    }
}

const app = express();
const server = http.createServer(app);

// CORS 설정
const allowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    process.env.FRONTEND_URL,
    'capacitor://localhost',
    'http://localhost'
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
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

// Socket.IO
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});

const socketHandler = require('./socket/index');
socketHandler(io);
app.set('io', io);

app.use((req, res, next) => {
    req.io = io;
    next();
});

// 라우트
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const noticeRoutes = require('./routes/notices');
const postRoutes = require('./routes/posts');
const channelRoutes = require('./routes/channels');
const channelMemberRoutes = require('./routes/channelMembers');
const superadminRoutes = require('./routes/superadmin');
const pollRoutes = require('./routes/polls');
const pushRoutes = require('./routes/push');
const initPollReminders = require('./utils/pollReminder');

// 미들웨어
app.use(express.json());
app.use(cookieParser());

// 업로드 폴더
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

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

app.get('/', (req, res) => res.send('API is running'));

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat')
    .then(async () => {
        console.log('MongoDB connected');

        initPollReminders(io);

        // 최고관리자 자동 생성
        try {
            const adminExists = await User.findOne({ username: 'admin' });
            if (!adminExists) {
                await User.create({
                    name: '최고관리자',
                    username: 'admin',
                    password: 'dkfvkrh123',
                    role: 'superadmin'
                });
            }
        } catch (err) {
            console.error('Admin init error:', err);
        }

        // 채팅방 인덱스 정리 (한 번만 필요)
        try {
            const chatrooms = mongoose.connection.db.collection('chatrooms');
            const indexes = await chatrooms.indexes();
            const oldIndex = indexes.find(idx =>
                idx.key.adminId === 1 && idx.key.memberId === 1 && Object.keys(idx.key).length === 2
            );
            if (oldIndex) await chatrooms.dropIndex(oldIndex.name);
        } catch (err) {
            // 인덱스가 없으면 무시
        }
    })
    .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
