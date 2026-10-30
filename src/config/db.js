const { Pool } = require('pg');
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV
} = require('./env');

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

let dbStatus = 'disconnected';
let dbError = null;

async function connectDatabase() {
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
    dbError = null;
    console.log('Database connected successfully.');
    return true;
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    console.warn('Database connection failed. Please ensure PostgreSQL is running and environment values are correct.');
    console.warn(error.message);
    return false;
  }
}

pool.on('error', (error) => {
  dbStatus = 'error';
  dbError = error.message;
  console.error('Unexpected database error:', error.message);
});

function getDbStatus() {
  return {
    state: dbStatus,
    error: dbError || (dbStatus === 'error' ? 'Database connection failed.' : null)
  };
}

module.exports = {
  pool,
  connectDatabase,
  getDbStatus
};
