require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const webpush = require('web-push');
const { getPool } = require('./db/mssql');

// Web Push VAPID 설정
const vapidPublic = process.env.PUBLIC_VAPID_KEY;
const vapidPrivate = process.env.PRIVATE_VAPID_KEY;

if (vapidPublic && vapidPrivate) {
    try {
        webpush.setVapidDetails('mailto:contact@example.com', vapidPublic, vapidPrivate);
    } catch (err) {
        console.error('[VAPID] Failed to set VAPID details:', err.message);
    }
}

const app = express();
const server = http.createServer(app);

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

app.use(express.json());
app.use(cookieParser());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channel-members', channelMemberRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/polls', pollRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// MSSQL 연결 후 서버 시작
getPool()
    .then(() => {
        console.log('MSSQL 연결 성공');
        initPollReminders(io);

        server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('MSSQL 연결 실패:', err);
        process.exit(1);
    });
