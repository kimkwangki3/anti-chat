const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/mssql');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await queryOne(
                'SELECT id, name, username, nickname, profileImage, gender, birthdate, phone, memo, role, isOnline, status, currentSessionId, lastLoginAt, lastLoginIp, createdAt FROM Users WHERE id = @id',
                { id: decoded.id }
            );

            if (!user) {
                return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
            }

            if (user.status !== 'active' && user.role !== 'superadmin') {
                const statusMsg = user.status === 'suspended'
                    ? '계정이 휴정되었습니다. 관리자에게 문의하세요.'
                    : '탈퇴된 계정입니다.';
                return res.status(403).json({ message: statusMsg });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: '인증에 실패했습니다. 토큰이 유효하지 않습니다.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
};

const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        next();
    } else {
        res.status(401).json({ message: '관리자 권한이 필요합니다.' });
    }
};

const superAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(401).json({ message: '최고 관리자 권한이 필요합니다.' });
    }
};

module.exports = { protect, admin, superAdmin };
