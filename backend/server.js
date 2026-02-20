require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const webpush = require('web-push');

// Web Push VAPID 설정
webpush.setVapidDetails(
    'mailto:contact@example.com',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
);

const app = express();
const server = http.createServer(app);

// Middleware & Socket.IO Setup
const allowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    process.env.FRONTEND_URL
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

// 데이터베이스 연결
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat')
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.error('MongoDB 연결 실패:', err));

// Routes (Placeholder)
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
