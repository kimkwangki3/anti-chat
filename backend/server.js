require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
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

// 소켓 IO를 요청 객체에 첨부
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channel-members', channelMemberRoutes);

// 데이터베이스 연결 (IPv4 127.0.0.1 명시)
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate-chat')
    .then(() => console.log('MongoDB 연결 성공 (127.0.0.1)'))
    .catch(err => console.error('MongoDB 연결 실패:', err));

const socketHandler = require('./socket/index');

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

socketHandler(io);

// Routes (Placeholder)
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
