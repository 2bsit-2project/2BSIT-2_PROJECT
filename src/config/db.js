const { Pool } = require('pg');
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV
} = require('./env');
const { hashPassword } = require('./security');

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
const inMemorySessions = new Map();
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
      ON user_sessions (expires_at);
    `);

    dbStatus = 'connected';
    dbError = null;
    return true;
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    console.warn('Database initialization failed. Using in-memory fallback for user registration:', error.message);
    return false;
  }
}

async function connectDatabase() {
  try {
    await pool.query('SELECT 1');
    const initialized = await initializeDatabase();
    if (!initialized) {
      return false;
    }

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

async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (dbStatus !== 'connected') {
    const user = inMemoryUsers.find((item) => item.email.toLowerCase() === normalizedEmail);
    return user ? { ...user } : null;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  } catch (error) {
    console.warn('Unable to find user in database. Checking in-memory store.', error.message);
    const user = inMemoryUsers.find((item) => item.email.toLowerCase() === normalizedEmail);
    return user ? { ...user } : null;
  }
}

async function createUser(rawUser) {
  const name = String(rawUser.name || rawUser.fullName || rawUser.username || 'User').trim();
  const email = String(rawUser.email || rawUser.userEmail || '').trim();
  const username = String(rawUser.username || rawUser.userName || email || name).trim();
  const password = String(rawUser.password || rawUser.userPassword || '');
  const status = String(rawUser.status || 'pending').trim().toLowerCase() || 'pending';

  if (!email) {
    const error = new Error('Email is required.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!password.trim()) {
    const error = new Error('Password is required.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const passwordHash = await hashPassword(password);

  if (dbStatus === 'connected') {
    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, username, password, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [name, email, username, passwordHash, status]
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
    password: passwordHash,
    status,
    createdAt: new Date().toISOString()
  };

  inMemoryUsers.unshift(newUser);
  return { ...newUser };
}

async function updateUserPassword(userId, password) {
  if (dbStatus === 'connected') {
    try {
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, userId]);
    } catch (error) {
      console.warn('Database password update failed. Updating in-memory user if available.', error.message);
    }
  }

  const user = inMemoryUsers.find((item) => String(item.id) === String(userId));
  if (user) {
    user.password = password;
  }
}

async function createSession(tokenHash, userId, expiresAt) {
  if (dbStatus === 'connected') {
    try {
      await pool.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
      await pool.query(
        'INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash, userId, expiresAt]
      );
      return;
    } catch (error) {
      console.warn('Database session creation failed. Using in-memory session store.', error.message);
    }
  }

  inMemorySessions.set(tokenHash, { userId, expiresAt: new Date(expiresAt).getTime() });
}

async function getSession(tokenHash) {
  if (dbStatus === 'connected') {
    try {
      const result = await pool.query(
        `SELECT user_id FROM user_sessions
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );
      if (result.rows[0]) {
        return { userId: result.rows[0].user_id };
      }

      const fallbackSession = inMemorySessions.get(tokenHash);
      if (fallbackSession && fallbackSession.expiresAt > Date.now()) {
        return { userId: fallbackSession.userId };
      }
      inMemorySessions.delete(tokenHash);
      return null;
    } catch (error) {
      console.warn('Database session lookup failed. Checking in-memory session store.', error.message);
    }
  }

  const session = inMemorySessions.get(tokenHash);
  if (!session || session.expiresAt <= Date.now()) {
    inMemorySessions.delete(tokenHash);
    return null;
  }
  return { userId: session.userId };
}

async function deleteSession(tokenHash) {
  if (dbStatus === 'connected') {
    try {
      await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]);
    } catch (error) {
      console.error('Database session deletion failed:', error.message);
      inMemorySessions.delete(tokenHash);
      throw error;
    }
  }

  inMemorySessions.delete(tokenHash);
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
  getUserByEmail,
  createUser,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
  updateUserStatus
};
