const sql = require('mssql');

const config = {
    server: process.env.MSSQL_SERVER || 'localhost',
    database: process.env.MSSQL_DATABASE || 'anti_chat',
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || '',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

const getPool = async () => {
    if (!pool) {
        pool = await sql.connect(config);
        pool.on('error', (err) => {
            console.error('[MSSQL] Pool error:', err);
            pool = null;
        });
    }
    return pool;
};

// SELECT 쿼리 — 레코드 배열 반환, _id 알리아스 자동 추가 (하위 호환)
const query = async (sqlText, params = {}) => {
    const p = await getPool();
    const req = p.request();
    for (const [key, value] of Object.entries(params)) {
        req.input(key, value);
    }
    const result = await req.query(sqlText);
    return result.recordset.map(row => ({ ...row, _id: row.id }));
};

// SELECT 쿼리 — 첫 번째 레코드만 반환
const queryOne = async (sqlText, params = {}) => {
    const rows = await query(sqlText, params);
    return rows[0] || null;
};

// INSERT/UPDATE/DELETE — recordset 없이 result 전체 반환
const execute = async (sqlText, params = {}) => {
    const p = await getPool();
    const req = p.request();
    for (const [key, value] of Object.entries(params)) {
        req.input(key, value);
    }
    return await req.query(sqlText);
};

// INSERT 후 생성된 id 반환
const insertAndGetId = async (sqlText, params = {}) => {
    const p = await getPool();
    const req = p.request();
    for (const [key, value] of Object.entries(params)) {
        req.input(key, value);
    }
    const result = await req.query(sqlText + '; SELECT SCOPE_IDENTITY() AS id');
    const row = result.recordset[0];
    return row ? Number(row.id) : null;
};

module.exports = { sql, getPool, query, queryOne, execute, insertAndGetId };
