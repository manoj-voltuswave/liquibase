const mysql = require('mysql2/promise');

const baseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool = null;

async function getPool() {
  if (!baseConfig.host || !baseConfig.user) {
    return null;
  }
  if (!pool) {
    pool = mysql.createPool(baseConfig);
  }
  return pool;
}

/**
 * Get a connection bound to a specific schema (database). Caller must release it.
 * @param {string} schema - Database/schema name
 */
async function getConnectionForSchema(schema) {
  if (!schema) {
    throw new Error('Schema/database name is required');
  }
  const p = await getPool();
  if (!p) {
    throw new Error('Database not configured: set DB_HOST, DB_USER (and DB_PASSWORD) in .env');
  }
  const conn = await p.getConnection();
  try {
    await conn.changeUser({ database: schema });
    return conn;
  } catch (err) {
    conn.release();
    throw err;
  }
}

/**
 * Run a parameterized query against a specific schema.
 * @param {string} schema - Database/schema name
 * @param {string} sql - SQL with ? placeholders
 * @param {unknown[]} [params]
 */
async function queryForSchema(schema, sql, params = []) {
  const conn = await getConnectionForSchema(schema);
  try {
    return await conn.execute(sql, params);
  } finally {
    conn.release();
  }
}

/**
 * Ping RDS. If schema is provided, checks that schema is reachable.
 * @param {string} [schema] - Optional database/schema name
 * @returns {{ ok: boolean, error?: string, latencyMs?: number }}
 */
async function ping(schema) {
  const start = Date.now();
  try {
    const p = await getPool();
    if (!p) {
      return { ok: false, error: 'Database not configured' };
    }
    let conn;
    if (schema) {
      conn = await getConnectionForSchema(schema);
    } else {
      conn = await p.getConnection();
    }
    try {
      const [rows] = await conn.execute('SELECT 1 AS n');
      const latencyMs = Date.now() - start;
      return { ok: Array.isArray(rows) && rows[0]?.n === 1, latencyMs };
    } finally {
      conn.release();
    }
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  getConnectionForSchema,
  queryForSchema,
  ping,
  close,
};
