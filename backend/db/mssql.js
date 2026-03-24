const sql = require('mssql');

const baseConfig = {
    server: process.env.MSSQL_SERVER || 'localhost',
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || '',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// 마스터 DB 풀
let masterPool = null;
const getPool = async () => {
    if (!masterPool) {
        masterPool = await new sql.ConnectionPool({ ...baseConfig, database: process.env.MSSQL_DATABASE || 'anti_chat' }).connect();
        masterPool.on('error', (err) => { console.error('[MSSQL] Master pool error:', err); masterPool = null; });
    }
    return masterPool;
};

// 채널별 DB 풀 캐시
const channelPools = {};
const getChannelPool = async (databaseName) => {
    if (channelPools[databaseName]) return channelPools[databaseName];
    const p = await new sql.ConnectionPool({ ...baseConfig, database: databaseName }).connect();
    p.on('error', (err) => { console.error(`[MSSQL] Channel pool error (${databaseName}):`, err); delete channelPools[databaseName]; });
    channelPools[databaseName] = p;
    return p;
};

// 풀에서 직접 실행하는 헬퍼 함수들
const runQuery = async (pool, sqlText, params = {}) => {
    const req = pool.request();
    for (const [key, value] of Object.entries(params)) req.input(key, value);
    const result = await req.query(sqlText);
    return result.recordset.map(row => ({ ...row, _id: row.id }));
};

const queryInPool = async (pool, sqlText, params = {}) => {
    return runQuery(pool, sqlText, params);
};

const queryOneInPool = async (pool, sqlText, params = {}) => {
    const rows = await runQuery(pool, sqlText, params);
    return rows[0] || null;
};

const executeInPool = async (pool, sqlText, params = {}) => {
    const req = pool.request();
    for (const [key, value] of Object.entries(params)) req.input(key, value);
    return await req.query(sqlText);
};

const insertAndGetIdInPool = async (pool, sqlText, params = {}) => {
    const req = pool.request();
    for (const [key, value] of Object.entries(params)) req.input(key, value);
    const result = await req.query(sqlText + '; SELECT SCOPE_IDENTITY() AS id');
    const row = result.recordset[0];
    return row ? Number(row.id) : null;
};

// 채널 DB에 스키마 초기화 (채널 생성 시 호출)
const initChannelDb = async (databaseName) => {
    const masterP = await getPool();
    // DB 생성
    await masterP.request().query(`IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name='${databaseName}') CREATE DATABASE [${databaseName}]`);
    // 채널 스키마 적용
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'channel-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    const channelP = await getChannelPool(databaseName);
    const statements = schemaSQL.split(/\bGO\b/i).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
        await channelP.request().query(stmt);
    }
};

// 마스터 DB 헬퍼 (기존 코드 호환)
const query = async (sqlText, params = {}) => {
    const p = await getPool();
    return runQuery(p, sqlText, params);
};

const queryOne = async (sqlText, params = {}) => {
    const rows = await query(sqlText, params);
    return rows[0] || null;
};

const execute = async (sqlText, params = {}) => {
    const p = await getPool();
    const req = p.request();
    for (const [key, value] of Object.entries(params)) req.input(key, value);
    return await req.query(sqlText);
};

const insertAndGetId = async (sqlText, params = {}) => {
    const p = await getPool();
    const req = p.request();
    for (const [key, value] of Object.entries(params)) req.input(key, value);
    const result = await req.query(sqlText + '; SELECT SCOPE_IDENTITY() AS id');
    const row = result.recordset[0];
    return row ? Number(row.id) : null;
};

module.exports = {
    sql, getPool, getChannelPool, initChannelDb,
    query, queryOne, execute, insertAndGetId,
    queryInPool, queryOneInPool, executeInPool, insertAndGetIdInPool
};
