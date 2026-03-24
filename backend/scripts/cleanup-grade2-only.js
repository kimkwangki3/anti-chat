// USER_GRADE = 2 가 아닌 유저를 채널 DB에서 삭제하는 스크립트
// 사용법: node backend/scripts/cleanup-grade2-only.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPool, query, getChannelPool, executeInPool } = require('../db/mssql');

async function main() {
    console.log('USER_GRADE != 2 유저 정리 시작...');
    await getPool();

    const channels = await query(
        `SELECT id, name, linkedServer, linkedDb, databaseName
         FROM Channels WHERE status='active' AND syncEnabled=1 AND linkedServer IS NOT NULL AND databaseName IS NOT NULL`
    );

    for (const ch of channels) {
        console.log(`\n[${ch.name}] 처리 중...`);
        try {
            const masterPool = await getPool();

            // 외부 DB에서 USER_GRADE = 2 인 USER_ID 목록 조회
            const grade2Sql = `SELECT USER_ID FROM OPENQUERY([${ch.linkedServer}], 'SELECT USER_ID FROM ${ch.linkedDb}.dbo.USER_MST WHERE USER_GRADE = 2')`;
            const grade2Result = await masterPool.request().query(grade2Sql);
            const grade2Ids = new Set(grade2Result.recordset.map(r => String(r.USER_ID).trim()));
            console.log(`  외부 DB USER_GRADE=2 유저 수: ${grade2Ids.size}명`);

            // 채널 DB에서 전체 유저 목록 조회
            const channelPool = await getChannelPool(ch.databaseName);
            const channelUsers = await channelPool.request().query('SELECT id, username FROM Users');
            const allUsers = channelUsers.recordset;
            console.log(`  채널 DB 현재 유저 수: ${allUsers.length}명`);

            // grade2 목록에 없는 유저 삭제
            let deleted = 0;
            for (const user of allUsers) {
                if (!grade2Ids.has(String(user.username).trim())) {
                    await executeInPool(channelPool, 'DELETE FROM Users WHERE id=@id', { id: user.id });
                    deleted++;
                }
            }

            console.log(`  삭제된 유저: ${deleted}명, 남은 유저: ${allUsers.length - deleted}명`);
        } catch (e) {
            console.error(`  오류:`, e.message);
        }
    }

    console.log('\n정리 완료. 프로세스 종료.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
