// 기존 채널에 per-channel DB 초기화 스크립트
// 사용법: node backend/scripts/init-existing-channels.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPool, query, execute, initChannelDb } = require('../db/mssql');

async function slugToDbName(slug, channelId) {
    const safe = String(slug || '').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 40).toLowerCase();
    return `ch_${safe}_${channelId}`;
}

async function main() {
    console.log('채널 DB 초기화 시작...');
    await getPool();

    const channels = await query("SELECT id, name, slug, databaseName FROM Channels WHERE status='active'");
    console.log(`총 채널 수: ${channels.length}`);

    for (const ch of channels) {
        if (ch.databaseName) {
            console.log(`[SKIP] 채널 "${ch.name}" — 이미 databaseName: ${ch.databaseName}`);
            continue;
        }

        const dbName = await slugToDbName(ch.slug || ch.name, ch.id);
        console.log(`[INIT] 채널 "${ch.name}" → DB: ${dbName}`);

        try {
            await execute('UPDATE Channels SET databaseName=@dbName WHERE id=@id', { dbName, id: ch.id });
            await initChannelDb(dbName);
            console.log(`  ✓ 완료`);
        } catch (e) {
            console.error(`  ✗ 오류:`, e.message);
        }
    }

    console.log('\n모든 채널 초기화 완료. 프로세스 종료.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
