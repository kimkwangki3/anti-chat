// 기존 채널 DB에 presenceStatus 컬럼과 LoginHistory 테이블 추가
// 사용법: node backend/scripts/migrate-presence-login-history.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPool, query, getChannelPool, executeInPool } = require('../db/mssql');

async function main() {
    console.log('presenceStatus + LoginHistory 마이그레이션 시작...');
    await getPool();

    const channels = await query(
        "SELECT id, name, databaseName FROM Channels WHERE status='active' AND databaseName IS NOT NULL"
    );

    for (const ch of channels) {
        console.log(`\n[${ch.name}] 처리 중...`);
        try {
            const pool = await getChannelPool(ch.databaseName);

            // presenceStatus 컬럼 추가
            await executeInPool(pool, `
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'presenceStatus')
                    ALTER TABLE Users ADD presenceStatus NVARCHAR(20) DEFAULT 'offline'
            `, {});
            console.log(`  ✓ presenceStatus 컬럼 추가`);

            // 기존 온라인 유저 상태 초기화 (서버 재시작 시 모두 offline으로)
            await executeInPool(pool, `
                UPDATE Users SET isOnline=0, presenceStatus='offline'
            `, {});
            console.log(`  ✓ 기존 유저 상태 초기화`);

            // LoginHistory 테이블 생성
            await executeInPool(pool, `
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoginHistory' AND xtype='U')
                CREATE TABLE LoginHistory (
                    id        INT           IDENTITY(1,1) PRIMARY KEY,
                    userId    INT           NOT NULL,
                    ip        NVARCHAR(100),
                    userAgent NVARCHAR(500),
                    loginAt   DATETIME      DEFAULT GETDATE(),
                    logoutAt  DATETIME      NULL
                )
            `, {});
            console.log(`  ✓ LoginHistory 테이블 생성`);

        } catch (e) {
            console.error(`  오류:`, e.message);
        }
    }

    console.log('\n마이그레이션 완료. 프로세스 종료.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
