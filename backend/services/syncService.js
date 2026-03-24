// 외부 MSSQL DB → 채널 전용 DB 실시간 동기화 서비스
const { getPool, query, execute, getChannelPool, queryOneInPool, executeInPool, insertAndGetIdInPool } = require('../db/mssql');

const SYNC_INTERVAL_MS = 60 * 1000; // 1분마다 동기화

// USER_MST 행 → anti-chat Users 레코드 매핑
const mapRow = (row) => ({
    username:      (String(row.USER_ID || '')).trim(),
    name:          (String(row.USER_NM || row.USER_ID || '')).trim(),
    nickname:      row.USER_NICK_NM ? String(row.USER_NICK_NM).trim() : null,
    password:      String(row.USER_PWD || ''),
    phone:         row.USER_HP   ? String(row.USER_HP).trim()  : (row.USER_TEL ? String(row.USER_TEL).trim() : null),
    birthdate:     row.BIRTH_DT  ? String(row.BIRTH_DT).trim() : null,
    memo:          row.USER_BIGO ? String(row.USER_BIGO).trim() : '',
    recommender:   row.RECOMM_NM ? String(row.RECOMM_NM).trim() : null,
    registrationIp: row.USER_CREATE_IP ? String(row.USER_CREATE_IP).trim() : null,
    status:        (row.USER_BLACK === 1 || row.USER_BLACK === '1' || row.USER_BLACK === 'Y') ? 'suspended' : 'approved',
    role:          'member',
    gender:        'none',
});

// 채널 1개 동기화
const syncChannel = async (channel) => {
    const { id: channelId, name: channelName, linkedServer, linkedDb, databaseName, lastSyncAt } = channel;

    try {
        const masterPool = await getPool();

        // 마지막 동기화 이후 변경된 레코드만 (첫 실행이면 전체)
        let innerWhere = '';
        if (lastSyncAt) {
            const d = new Date(lastSyncAt);
            const dateStr = d.getFullYear().toString()
                + String(d.getMonth() + 1).padStart(2, '0')
                + String(d.getDate()).padStart(2, '0');
            // UPDATE_DT 또는 REG_DT 가 마지막 동기화 날짜 이후인 것
            innerWhere = ` WHERE REG_DT >= ''${dateStr}'' OR (UPDATE_DT IS NOT NULL AND UPDATE_DT >= ''${dateStr}'')`;
        }

        const cols = 'USER_ID, USER_NM, USER_NICK_NM, USER_PWD, USER_HP, USER_TEL, BIRTH_DT, USER_CREATE_IP, RECOMM_NM, USER_BIGO, USER_BLACK, USER_GRADE, UPDATE_DT, REG_DT';
        const innerSql = `SELECT ${cols} FROM ${linkedDb}.dbo.USER_MST${innerWhere}`;
        const outerSql = `SELECT * FROM OPENQUERY([${linkedServer}], '${innerSql}')`;

        const result = await masterPool.request().query(outerSql);
        const rows = result.recordset;

        if (!rows.length) {
            console.log(`[Sync] ${channelName}: 변경 없음`);
            await execute('UPDATE Channels SET lastSyncAt=GETDATE() WHERE id=@id', { id: channelId });
            return;
        }

        const channelPool = await getChannelPool(databaseName);
        let inserted = 0, updated = 0, skipped = 0;

        for (const row of rows) {
            const u = mapRow(row);
            if (!u.username) { skipped++; continue; }

            try {
                const existing = await queryOneInPool(channelPool, 'SELECT id FROM Users WHERE username=@username', { username: u.username });

                if (existing) {
                    await executeInPool(channelPool,
                        `UPDATE Users SET name=@name, nickname=@nickname, password=@password,
                         phone=@phone, birthdate=@birthdate, memo=@memo, recommender=@recommender,
                         status=@status, updatedAt=GETDATE() WHERE username=@username`,
                        { name: u.name, nickname: u.nickname, password: u.password,
                          phone: u.phone, birthdate: u.birthdate, memo: u.memo,
                          recommender: u.recommender, status: u.status, username: u.username }
                    );
                    updated++;
                } else {
                    await insertAndGetIdInPool(channelPool,
                        `INSERT INTO Users (username, name, nickname, password, phone, birthdate, memo,
                         recommender, registrationIp, status, role, gender, agreedToPrivacy)
                         VALUES (@username, @name, @nickname, @password, @phone, @birthdate, @memo,
                         @recommender, @registrationIp, @status, @role, @gender, 1)`,
                        { username: u.username, name: u.name, nickname: u.nickname, password: u.password,
                          phone: u.phone, birthdate: u.birthdate, memo: u.memo,
                          recommender: u.recommender, registrationIp: u.registrationIp,
                          status: u.status, role: u.role, gender: u.gender }
                    );
                    inserted++;
                }
            } catch (e) {
                skipped++;
                // 개별 유저 오류는 계속 진행
            }
        }

        await execute('UPDATE Channels SET lastSyncAt=GETDATE() WHERE id=@id', { id: channelId });
        console.log(`[Sync] ${channelName}: 신규 ${inserted}명, 업데이트 ${updated}명, 건너뜀 ${skipped}명`);
    } catch (e) {
        console.error(`[Sync] ${channelName} 오류:`, e.message);
    }
};

// 전체 동기화 대상 채널 실행
const runSync = async () => {
    try {
        const channels = await query(
            `SELECT id, name, linkedServer, linkedDb, databaseName, lastSyncAt
             FROM Channels
             WHERE status='active' AND syncEnabled=1
               AND linkedServer IS NOT NULL AND databaseName IS NOT NULL`
        );
        if (!channels.length) return;

        for (const channel of channels) {
            await syncChannel(channel);
        }
    } catch (e) {
        console.error('[Sync] 스케줄러 오류:', e.message);
    }
};

let syncTimer = null;

const startSyncService = () => {
    console.log('[Sync] 외부 DB 동기화 서비스 시작 (1분 간격)');
    // 서버 시작 10초 후 첫 동기화
    setTimeout(() => {
        runSync();
        syncTimer = setInterval(runSync, SYNC_INTERVAL_MS);
    }, 10000);
};

const stopSyncService = () => {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
};

module.exports = { startSyncService, stopSyncService, runSync };
