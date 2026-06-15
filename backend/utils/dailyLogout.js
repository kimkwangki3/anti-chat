// 매일 오전 6시(한국시간) 전체 자동 로그아웃 스케줄러
const cron = require('node-cron');
const { query, execute, getChannelPool, executeInPool } = require('../db/mssql');

// 전체 로그아웃 실행: 접속 중인 모든 클라이언트 강제 로그아웃 + 전 사용자 오프라인/세션 초기화
const runFullLogout = async (io) => {
    try {
        // 1) 접속 중인 모든 소켓 강제 로그아웃 (프론트가 로그인 화면으로 보냄)
        if (io) {
            io.emit('force_logout', { message: '정기 자동 로그아웃 시간입니다. 다시 로그인해 주세요.' });
        }

        // 2) 마스터 DB(슈퍼어드민/채널관리자) 오프라인 + 세션 초기화
        await execute("UPDATE Users SET isOnline=0, currentSessionId=NULL WHERE isOnline=1 OR currentSessionId IS NOT NULL");

        // 3) 모든 채널 DB 회원 오프라인 + 세션 초기화
        const channels = await query("SELECT databaseName FROM Channels WHERE databaseName IS NOT NULL");
        for (const ch of channels) {
            try {
                const pool = await getChannelPool(ch.databaseName);
                await executeInPool(pool, "UPDATE Users SET isOnline=0, presenceStatus='offline', currentSessionId=NULL WHERE isOnline=1 OR currentSessionId IS NOT NULL");
            } catch (e) {
                console.error(`[DailyLogout] 채널 DB 오류 (${ch.databaseName}):`, e.message);
            }
        }
        console.log('[DailyLogout] 전체 로그아웃 완료:', new Date().toISOString());
    } catch (e) {
        console.error('[DailyLogout] 오류:', e.message);
    }
};

// 매일 06:00 (Asia/Seoul) 스케줄 등록
const scheduleDailyLogout = (io) => {
    cron.schedule('0 6 * * *', () => runFullLogout(io), { timezone: 'Asia/Seoul' });
    console.log('[DailyLogout] 매일 06:00(KST) 전체 로그아웃 스케줄 등록됨');
};

module.exports = { scheduleDailyLogout, runFullLogout };
