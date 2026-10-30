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
let inMemoryUsers = [];
let nextUserId = 1;

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    dbStatus = 'connected';
    dbError = null;
    return true;
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    console.warn('Database connection failed. Using in-memory fallback for user registration.');
    return false;
  }
}

async function connectDatabase() {
  try {
    await pool.query('SELECT 1');
    await initializeDatabase();
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

function userRowToRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username || row.email,
    password: row.password,
    status: row.status || 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

async function listUsers(statusFilter) {
  if (dbStatus !== 'connected') {
    const records = statusFilter
      ? inMemoryUsers.filter((user) => user.status === statusFilter)
      : [...inMemoryUsers];
    return records.map((user) => ({ ...user }));
  }

  try {
    let query = 'SELECT * FROM users';
    const params = [];

    if (statusFilter) {
      query += ' WHERE status = $1';
      params.push(statusFilter);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows.map(userRowToRecord);
  } catch (error) {
    console.warn('Unable to read users from database. Falling back to in-memory store.', error.message);
    const records = statusFilter
      ? inMemoryUsers.filter((user) => user.status === statusFilter)
      : [...inMemoryUsers];
    return records.map((user) => ({ ...user }));
  }
}

async function getUserById(userId) {
  if (dbStatus !== 'connected') {
    const user = inMemoryUsers.find((item) => String(item.id) === String(userId));
    return user ? { ...user } : null;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  } catch (error) {
    console.warn('Unable to read user from database. Falling back to in-memory store.', error.message);
    const user = inMemoryUsers.find((item) => String(item.id) === String(userId));
    return user ? { ...user } : null;
  }
}

async function createUser(rawUser) {
  const name = String(rawUser.name || rawUser.fullName || rawUser.username || 'User').trim();
  const email = String(rawUser.email || rawUser.userEmail || '').trim();
  const username = String(rawUser.username || rawUser.userName || email || name).trim();
  const password = String(rawUser.password || rawUser.userPassword || '').trim();
  const status = String(rawUser.status || 'pending').trim().toLowerCase() || 'pending';

  if (!email) {
    const error = new Error('Email is required.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!password) {
    const error = new Error('Password is required.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (dbStatus === 'connected') {
    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, username, password, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [name, email, username, password, status]
      );
      return userRowToRecord(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('A user with this email already exists.');
        duplicateError.code = 'DUPLICATE_EMAIL';
        throw duplicateError;
      }

      console.warn('Database insert failed. Falling back to in-memory store.', error.message);
    }
  }

  const duplicateUser = inMemoryUsers.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (duplicateUser) {
    const duplicateError = new Error('A user with this email already exists.');
    duplicateError.code = 'DUPLICATE_EMAIL';
    throw duplicateError;
  }

  const newUser = {
    id: nextUserId++,
    name,
    email,
    username,
    password,
    status,
    createdAt: new Date().toISOString()
  };

  inMemoryUsers.unshift(newUser);
  return { ...newUser };
}

async function updateUserStatus(userId, newStatus) {
  const status = String(newStatus || 'pending').trim().toLowerCase();

  if (!status) {
    const error = new Error('Status is required.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (dbStatus === 'connected') {
    try {
      const result = await pool.query(
        'UPDATE users SET status = $1 WHERE id = $2 RETURNING *;',
        [status, userId]
      );
      return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
    } catch (error) {
      console.warn('Database update failed. Falling back to in-memory store.', error.message);
    }
  }

  const userIndex = inMemoryUsers.findIndex((user) => String(user.id) === String(userId));
  if (userIndex === -1) {
    return null;
  }

  inMemoryUsers[userIndex] = {
    ...inMemoryUsers[userIndex],
    status
  };

  return { ...inMemoryUsers[userIndex] };
}

module.exports = {
  pool,
  connectDatabase,
  initializeDatabase,
  getDbStatus,
  listUsers,
  getUserById,
  createUser,
  updateUserStatus
};
