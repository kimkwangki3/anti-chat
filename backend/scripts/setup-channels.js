// 4개 채널 초기 설정 스크립트
// 사용법: node backend/scripts/setup-channels.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPool, queryOne, execute, insertAndGetId, initChannelDb } = require('../db/mssql');

const CHANNELS = [
    { name: '골프채널',  slug: 'golf',   linkedServer: '211.175.217.19,6100', linkedDb: 'GTRADENEW' },
    { name: '이클릭채널', slug: 'eclick', linkedServer: '211.175.217.11,6100', linkedDb: 'GTRADENEW' },
    { name: '금메달채널', slug: 'gold',   linkedServer: '115.92.124.27,6100',  linkedDb: 'GTRADENEW' },
    { name: '바른채널',  slug: 'barun',  linkedServer: '110.4.89.210,4600',   linkedDb: 'GTRADENEW' },
];

// 슈퍼어드민 ID (master DB Users 테이블에서 role='superadmin')
const OWNER_ID = 1;

async function main() {
    console.log('채널 초기 설정 시작...');
    await getPool();

    for (const ch of CHANNELS) {
        try {
            const existing = await queryOne('SELECT id, databaseName FROM Channels WHERE name=@name', { name: ch.name });

            if (existing) {
                // 이미 존재하면 linkedServer/linkedDb/syncEnabled 업데이트
                const dbName = existing.databaseName || `ch_${ch.slug}_${existing.id}`;
                if (!existing.databaseName) {
                    await execute('UPDATE Channels SET databaseName=@dbName WHERE id=@id', { dbName, id: existing.id });
                    await initChannelDb(dbName);
                    console.log(`[UPDATE] "${ch.name}" DB 초기화: ${dbName}`);
                }
                await execute(
                    'UPDATE Channels SET linkedServer=@ls, linkedDb=@ld, syncEnabled=1 WHERE id=@id',
                    { ls: ch.linkedServer, ld: ch.linkedDb, id: existing.id }
                );
                console.log(`[UPDATE] "${ch.name}" 동기화 설정 완료 (id=${existing.id})`);
            } else {
                // 신규 생성
                const dbName = `ch_${ch.slug}_${Date.now().toString().slice(-6)}`;
                const channelId = await insertAndGetId(
                    `INSERT INTO Channels (ownerId, name, slug, databaseName, linkedServer, linkedDb, syncEnabled, status)
                     VALUES (@ownerId, @name, @slug, @dbName, @linkedServer, @linkedDb, 1, 'active')`,
                    { ownerId: OWNER_ID, name: ch.name, slug: ch.slug, dbName, linkedServer: ch.linkedServer, linkedDb: ch.linkedDb }
                );
                await initChannelDb(dbName);
                console.log(`[CREATE] "${ch.name}" 채널 생성 완료 (id=${channelId}, db=${dbName})`);
            }
        } catch (e) {
            console.error(`[ERROR] "${ch.name}":`, e.message);
        }
    }

    console.log('\n채널 설정 완료. 프로세스 종료.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
