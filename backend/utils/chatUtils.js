// 채팅 공통 유틸 — 채널 DB 기반 populateRoom
const { queryOne, getChannelPool, queryInPool, queryOneInPool } = require('../db/mssql');

// 채널 ID → databaseName 조회
const getChannelDbName = async (channelId) => {
    if (!channelId) return null;
    const ch = await queryOne('SELECT databaseName FROM Channels WHERE id=@id', { id: channelId });
    return ch?.databaseName || null;
};

// 채팅방 상세 조회 (채널 DB 기반 유저 JOIN)
const populateRoom = async (roomId, dbName) => {
    const usersRef = dbName ? `[${dbName}].dbo.Users` : 'Users';
    return queryOne(
        `SELECT r.*,
            a.id as admin_id, a.name as admin_name, a.username as admin_username,
            a.isOnline as admin_isOnline, a.profileImage as admin_profileImage, a.role as admin_role,
            m.id as member_id, m.name as member_name, m.username as member_username,
            m.isOnline as member_isOnline, m.profileImage as member_profileImage,
            m.role as member_role, m.status as member_status,
            c.name as channel_name, c.profileImage as channel_profileImage, c.cardColor as channel_cardColor
         FROM ChatRooms r
         LEFT JOIN Users a ON r.adminId = a.id
         LEFT JOIN ${usersRef} m ON r.memberId = m.id
         JOIN Channels c ON r.channelId = c.id
         WHERE r.id = @id`,
        { id: roomId }
    );
};

// 채팅방 ID만으로 조회 (채널 DB 자동 탐색)
const populateRoomById = async (roomId) => {
    const room = await queryOne('SELECT channelId FROM ChatRooms WHERE id=@id', { id: roomId });
    if (!room) return null;
    const dbName = await getChannelDbName(room.channelId);
    return populateRoom(roomId, dbName);
};

const formatRoom = (r) => {
    if (!r) return null;
    return {
        ...r,
        adminId: { _id: r.admin_id, id: r.admin_id, name: r.admin_name, username: r.admin_username, isOnline: r.admin_isOnline, profileImage: r.admin_profileImage, role: r.admin_role },
        memberId: { _id: r.member_id, id: r.member_id, name: r.member_name, username: r.member_username, isOnline: r.member_isOnline, profileImage: r.member_profileImage, role: r.member_role, status: r.member_status },
        channelId: { _id: r.channelId, id: r.channelId, name: r.channel_name, profileImage: r.channel_profileImage, cardColor: r.channel_cardColor }
    };
};

// 채널 관리자 userId 조회 (A안: 마스터 DB의 채널 ownerId = 채널관리자)
const getChannelAdminId = async (channelId) => {
    const ch = await queryOne('SELECT ownerId FROM Channels WHERE id=@id', { id: channelId });
    return ch?.ownerId || null;
};

// 채널 DB 승인된 멤버 목록 조회 (onlineOnly=true 시 온라인만)
const getChannelMembers = async (channelId, onlineOnly = false) => {
    const dbName = await getChannelDbName(channelId);
    if (!dbName) return [];
    const pool = await getChannelPool(dbName);
    const onlineFilter = onlineOnly ? "AND isOnline=1" : "";
    return queryInPool(pool,
        `SELECT id, name, username, isOnline, presenceStatus, profileImage FROM Users WHERE role='member' AND status='approved' ${onlineFilter} ORDER BY name`,
        {}
    );
};

module.exports = { getChannelDbName, populateRoom, populateRoomById, formatRoom, getChannelAdminId, getChannelMembers };
