// 외부 MSSQL DB(GTRADE USER_MST) → 채널 전용 DB 동기화 서비스
const { getPool, query, queryOne, execute, getChannelPool, queryOneInPool, executeInPool, insertAndGetIdInPool } = require('../db/mssql');

const SYNC_INTERVAL_MS = 60 * 1000; // (수동 모드에서는 사용 안 함)

// GTRADE USER_MST에서 가져올 컬럼
const SELECT_COLS = 'USER_ID, USER_NM, USER_NICK_NM, USER_PWD, USER_HP, USER_TEL, BIRTH_DT, USER_CREATE_IP, RECOMM_NM, USER_BIGO, USER_BLACK, USER_GRADE, UPDATE_DT, REG_DT';

// USER_MST ⋈ ACNT_MST (USER_ID로 연결). 계좌 중 하나라도 ACNT_STATE=7이면 BLOCKED7=1 → 로그인 차단 대상.
// OPENQUERY 내부(링크드서버)에서 실행되므로 문자열 리터럴은 없음(숫자 7만) → 따옴표 이스케이프 불필요.
const buildUserQuery = (linkedDb, whereClause) =>
    `SELECT ${SELECT_COLS}, ` +
    `CASE WHEN EXISTS (SELECT 1 FROM ${linkedDb}.dbo.ACNT_MST a WHERE a.USER_ID = u.USER_ID AND a.ACNT_STATE = 7) THEN 1 ELSE 0 END AS BLOCKED7 ` +
    `FROM ${linkedDb}.dbo.USER_MST u ${whereClause}`;

// USER_MST 행 → 채널 Users 레코드 매핑
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
    status:        (row.BLOCKED7 === 1 || row.BLOCKED7 === '1' ||
                    row.USER_BLACK === 1 || row.USER_BLACK === '1' || row.USER_BLACK === 'Y') ? 'suspended' : 'approved',
    role:          'member',
    gender:        'none',
    userGrade:     (row.USER_GRADE === null || row.USER_GRADE === undefined || row.USER_GRADE === '') ? null : parseInt(row.USER_GRADE, 10),
});

// 채널 DB에 회원 1명 upsert (id 보존). 반환: 'inserted' | 'updated'
const upsertUser = async (channelPool, u) => {
    const existing = await queryOneInPool(channelPool, 'SELECT id, status FROM Users WHERE username=@username', { username: u.username });
    if (existing) {
        // 로컬에서 탈퇴('withdrawn') 처리한 회원은 동기화가 되살리지 않도록 status 보존
        const statusToSet = existing.status === 'withdrawn' ? 'withdrawn' : u.status;
        await executeInPool(channelPool,
            `UPDATE Users SET name=@name, nickname=@nickname, password=@password,
             phone=@phone, birthdate=@birthdate, memo=@memo, recommender=@recommender,
             status=@status, userGrade=@userGrade, updatedAt=GETDATE() WHERE username=@username`,
            { name: u.name, nickname: u.nickname, password: u.password, phone: u.phone, birthdate: u.birthdate,
              memo: u.memo, recommender: u.recommender, status: statusToSet, userGrade: u.userGrade, username: u.username }
        );
        return 'updated';
    }
    await insertAndGetIdInPool(channelPool,
        `INSERT INTO Users (username, name, nickname, password, phone, birthdate, memo,
         recommender, registrationIp, status, role, gender, userGrade, agreedToPrivacy)
         VALUES (@username, @name, @nickname, @password, @phone, @birthdate, @memo,
         @recommender, @registrationIp, @status, @role, @gender, @userGrade, 1)`,
        { username: u.username, name: u.name, nickname: u.nickname, password: u.password, phone: u.phone,
          birthdate: u.birthdate, memo: u.memo, recommender: u.recommender, registrationIp: u.registrationIp,
          status: u.status, role: u.role, gender: u.gender, userGrade: u.userGrade }
    );
    return 'inserted';
};

// 채널 1개 동기화 (full=true면 전체, false면 증분). USER_GRADE 2,3만 가져옴
const syncChannel = async (channel, { full = false } = {}) => {
    const { id: channelId, name: channelName, linkedServer, linkedDb, databaseName, lastSyncAt } = channel;
    const masterPool = await getPool();

    let innerWhere = 'WHERE USER_GRADE IN (2,3)';
    if (!full && lastSyncAt) {
        const d = new Date(lastSyncAt);
        const dateStr = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
        innerWhere += ` AND (REG_DT >= ''${dateStr}'' OR (UPDATE_DT IS NOT NULL AND UPDATE_DT >= ''${dateStr}''))`;
    }
    const innerSql = buildUserQuery(linkedDb, innerWhere);
    const outerSql = `SELECT * FROM OPENQUERY([${linkedServer}], '${innerSql}')`;

    const result = await masterPool.request().query(outerSql);
    const rows = result.recordset;

    const channelPool = await getChannelPool(databaseName);
    let inserted = 0, updated = 0, skipped = 0;
    for (const row of rows) {
        const u = mapRow(row);
        if (!u.username) { skipped++; continue; }
        try {
            const r = await upsertUser(channelPool, u);
            if (r === 'inserted') inserted++; else updated++;
        } catch (e) { skipped++; }
    }
    await execute('UPDATE Channels SET lastSyncAt=GETDATE() WHERE id=@id', { id: channelId });
    console.log(`[Sync] ${channelName}: 신규 ${inserted}, 업데이트 ${updated}, 건너뜀 ${skipped} (full=${full})`);
    return { inserted, updated, skipped, total: rows.length };
};

// 채널 ID로 전체 동기화 (수동 버튼용)
const syncChannelById = async (channelId) => {
    const channel = await queryOne(
        `SELECT id, name, linkedServer, linkedDb, databaseName, lastSyncAt FROM Channels
         WHERE id=@id AND status='active' AND linkedServer IS NOT NULL AND databaseName IS NOT NULL`,
        { id: channelId }
    );
    if (!channel) throw new Error('동기화 대상 채널이 아닙니다. (외부 DB 연결 설정 확인)');
    return syncChannel(channel, { full: true });
};

// 로그인 백스톱: GTRADE에서 회원 1명만 가져와 채널 DB에 upsert. (신규/미동기화 회원 자동 보충)
const syncSingleUser = async (channel, username) => {
    const { linkedServer, linkedDb, databaseName } = channel;
    if (!linkedServer || !linkedDb || !databaseName) return null;
    // 인젝션 방지: 안전한 문자만 사용 (일반 USER_ID는 영숫자)
    const safeUser = String(username).replace(/[^A-Za-z0-9_.@-]/g, '');
    if (!safeUser) return null;
    try {
        const masterPool = await getPool();
        const innerSql = buildUserQuery(linkedDb, `WHERE USER_ID = ''${safeUser}'' AND USER_GRADE IN (2,3)`);
        const outerSql = `SELECT * FROM OPENQUERY([${linkedServer}], '${innerSql}')`;
        const result = await masterPool.request().query(outerSql);
        const row = result.recordset[0];
        if (!row) return null;
        const u = mapRow(row);
        if (!u.username) return null;
        const channelPool = await getChannelPool(databaseName);
        await upsertUser(channelPool, u);
        return await queryOneInPool(channelPool, 'SELECT * FROM Users WHERE username=@username', { username: u.username });
    } catch (e) {
        console.error('[Sync] 단일 회원 보충 오류:', e.message);
        return null;
    }
};

// (자동 폴링 — 현재 수동 모드라 server.js에서 호출하지 않음)
const runSync = async () => {
    try {
        const channels = await query(
            `SELECT id, name, linkedServer, linkedDb, databaseName, lastSyncAt
             FROM Channels
             WHERE status='active' AND syncEnabled=1 AND linkedServer IS NOT NULL AND databaseName IS NOT NULL`
        );
        for (const channel of channels) {
            try { await syncChannel(channel); } catch (e) { console.error(`[Sync] ${channel.name} 오류:`, e.message); }
        }
    } catch (e) {
        console.error('[Sync] 스케줄러 오류:', e.message);
    }
};

let syncTimer = null;
const startSyncService = () => {
    console.log('[Sync] 자동 동기화 스케줄러 시작 (1분 간격)');
    setTimeout(() => { runSync(); syncTimer = setInterval(runSync, SYNC_INTERVAL_MS); }, 10000);
};
const stopSyncService = () => { if (syncTimer) { clearInterval(syncTimer); syncTimer = null; } };

module.exports = { startSyncService, stopSyncService, runSync, syncChannel, syncChannelById, syncSingleUser };
