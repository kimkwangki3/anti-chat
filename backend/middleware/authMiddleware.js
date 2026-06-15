const jwt = require('jsonwebtoken');
const { queryOne, getChannelPool, queryOneInPool } = require('../db/mssql');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.isMaster) {
            // 슈퍼어드민 — 마스터 DB에서 조회
            const user = await queryOne(
                'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, role, isOnline, status, currentSessionId, lastLoginAt, lastLoginIp, createdAt FROM Users WHERE id = @id',
                { id: decoded.id }
            );
            if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
            req.user = { ...user, isMaster: true };
        } else if (decoded.isAdminMaster) {
            // 채널관리자 — 마스터 DB의 role='admin' 계정 (A안)
            const user = await queryOne(
                'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, role, isOnline, status, currentSessionId, lastLoginAt, lastLoginIp, createdAt FROM Users WHERE id = @id',
                { id: decoded.id }
            );
            if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
            if (user.status && user.status !== 'active') return res.status(403).json({ message: '계정이 정지되었습니다. 관리자에게 문의하세요.' });
            req.user = { ...user, role: 'admin', isAdminMaster: true, isMaster: false };
        } else {
            // 채널 유저 — JWT에 channels 배열 포함
            const { username, channels } = decoded;
            if (!channels?.length) return res.status(401).json({ message: '채널 정보가 없습니다.' });

            // 요청의 채널 컨텍스트 파악
            const channelIdRaw =
                req.headers['x-channel-id'] ||
                req.query.channelId ||
                req.body?.channelId ||
                req.params?.channelId;
            const channelId = channelIdRaw ? parseInt(channelIdRaw) : null;
            const channelEntry = channelId ? channels.find(c => c.channelId === channelId) : null;

            if (channelEntry) {
                // 특정 채널 컨텍스트 — 해당 채널 DB에서 유저 조회
                const pool = await getChannelPool(channelEntry.dbName);
                const user = await queryOneInPool(
                    pool,
                    'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, role, isOnline, status, isChatBlocked, currentSessionId, lastLoginAt, createdAt FROM Users WHERE id = @id',
                    { id: channelEntry.userId }
                );
                if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
                if (user.status === 'suspended') return res.status(403).json({ message: '계정이 정지되었습니다. 관리자에게 문의하세요.' });
                req.user = { ...user, channelId, channelDbName: channelEntry.dbName, channels, isMaster: false };
                req.channelPool = pool;
            } else {
                // 채널 컨텍스트 없음 — JWT 기반 최소 정보
                const adminEntry = channels.find(c => c.role === 'admin');
                req.user = {
                    username,
                    channels,
                    id: channels[0]?.userId || 0,
                    role: adminEntry ? 'admin' : 'member',
                    name: username,
                    isMaster: false
                };
            }
        }
        next();
    } catch (err) {
        console.error('[Auth]', err.message);
        return res.status(401).json({ message: '인증에 실패했습니다. 토큰이 유효하지 않습니다.' });
    }
};

const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.isMaster)) {
        next();
    } else {
        res.status(401).json({ message: '관리자 권한이 필요합니다.' });
    }
};

const superAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'superadmin' || req.user.isMaster)) {
        next();
    } else {
        res.status(401).json({ message: '최고 관리자 권한이 필요합니다.' });
    }
};

module.exports = { protect, admin, superAdmin };
