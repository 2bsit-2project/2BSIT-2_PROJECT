const { Pool } = require('pg');
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,

  NODE_ENV,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD

} = require('./env');
const { hashPassword } = require('./security');
const {
  DEFAULT_ADMIN_PERMISSIONS,
  normalizePermissions
} = require('./permissions');




  NODE_ENV,
  ADMIN_EMAIL,
  ADMIN_PASSWORD

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

const inMemoryPasswordResets = new Map();


const inMemoryPasswordResets = new Map();


const inMemoryPasswordResets = new Map();


const inMemoryPasswordResets = new Map();




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

        role VARCHAR(30) NOT NULL DEFAULT 'user',
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'user'");
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE');

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB');


    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB');



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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
      ON password_reset_tokens (expires_at);
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

  if (
    ADMIN_EMAIL && SUPERADMIN_EMAIL
    && ADMIN_EMAIL.trim().toLowerCase() === SUPERADMIN_EMAIL.trim().toLowerCase()
  ) {
    throw new Error('ADMIN_EMAIL and SUPERADMIN_EMAIL must be different accounts.');
  }


  try {
    await pool.query('SELECT 1');
    const initialized = await initializeDatabase();
    if (!initialized) {

      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);



      return false;
    }

    await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);

    await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


    await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


    await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);


      return false;
    }





    console.log('Database connected successfully.');
    return true;
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    console.warn('Database connection failed. Please ensure PostgreSQL is running and environment values are correct.');
    console.warn(error.message);

    try {
      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      await ensureSuperAdminUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    } catch (adminError) {
      console.error('Unable to initialize configured privileged accounts:', adminError.message);
    }




    try {
      await ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    } catch (adminError) {
      console.error('Unable to initialize the configured admin account:', adminError.message);
    }





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

    role: row.role || 'user',
    isBlocked: Boolean(row.is_blocked),
    permissions: row.permissions,


    role: row.role || 'user',
    isBlocked: Boolean(row.is_blocked),
    permissions: row.permissions,


    role: row.role || 'user',
    isBlocked: Boolean(row.is_blocked),


    role: row.role || 'user',
    isBlocked: Boolean(row.is_blocked),




    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

async function listUsers(statusFilter) {
  if (dbStatus !== 'connected') {
    const records = statusFilter
      ? inMemoryUsers.filter((user) => user.status === statusFilter)
      : [...inMemoryUsers];

    return records.map((user) => ({ ...user })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));


    return records.map((user) => ({ ...user })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));


    return records.map((user) => ({ ...user })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));


    return records.map((user) => ({ ...user })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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


async function listManagedUsers(statusFilter) {
  if (dbStatus !== 'connected') {
    return inMemoryUsers
      .filter((user) => String(user.role || 'user').toLowerCase() !== 'superadmin')
      .filter((user) => !statusFilter || user.status === statusFilter)
      .map((user) => ({ ...user }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const params = [];
  let query = "SELECT * FROM users WHERE LOWER(COALESCE(role, 'user')) <> 'superadmin'";
  if (statusFilter) {
    params.push(statusFilter);
    query += ' AND status = $1';
  }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows.map(userRowToRecord);
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

      const duplicate = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (duplicate.rowCount) {
        const duplicateError = new Error('A user with this email already exists.');
        duplicateError.code = 'DUPLICATE_EMAIL';
        throw duplicateError;
      }

      const result = await pool.query(

        `INSERT INTO users (name, email, username, password, status, role, is_blocked, permissions)
         VALUES ($1, $2, $3, $4, $5, 'user', FALSE, '[]'::jsonb)


        `INSERT INTO users (name, email, username, password, status, role, is_blocked, permissions)
         VALUES ($1, $2, $3, $4, $5, 'user', FALSE, '[]'::jsonb)

        `INSERT INTO users (name, email, username, password, status, role, is_blocked)
         VALUES ($1, $2, $3, $4, $5, 'user', FALSE)



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

    role: 'user',
    isBlocked: false,
    permissions: [],


    role: 'user',
    isBlocked: false,
    permissions: [],


    role: 'user',
    isBlocked: false,


    role: 'user',
    isBlocked: false,





    createdAt: new Date().toISOString()
  };

  inMemoryUsers.unshift(newUser);
  return { ...newUser };
}


async function ensurePrivilegedUser(email, password, role) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const adminPassword = String(password || '');
  if (!normalizedEmail && !adminPassword) {
    return null;
  }
  if (!normalizedEmail || adminPassword.length < 8) {

    const roleLabel = role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN';
    throw new Error(`Set both ${roleLabel}_EMAIL and a ${roleLabel}_PASSWORD of at least 8 characters.`);


    const roleLabel = role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN';
    throw new Error(`Set both ${roleLabel}_EMAIL and a ${roleLabel}_PASSWORD of at least 8 characters.`);


    const roleLabel = role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN';
    throw new Error(`Set both ${roleLabel}_EMAIL and a ${roleLabel}_PASSWORD of at least 8 characters.`);

    throw new Error('Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters.');



  }

  if (dbStatus === 'connected') {
    const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows[0]) {
      const result = await pool.query(

        `UPDATE users
         SET role = $1, status = 'active', is_blocked = FALSE,
             permissions = CASE
               WHEN $1 = 'admin'
                 AND (LOWER(COALESCE(role, 'user')) <> 'admin' OR permissions IS NULL)
               THEN $3::jsonb
               ELSE permissions
             END
         WHERE id = $2 RETURNING *`,
        [role, existing.rows[0].id, JSON.stringify(DEFAULT_ADMIN_PERMISSIONS)]



        "UPDATE users SET role = $1, status = 'active', is_blocked = FALSE WHERE id = $2 RETURNING *",

        'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',

        [role, existing.rows[0].id]


      );
      return userRowToRecord(result.rows[0]);
    }

    const passwordHash = await hashPassword(adminPassword);
    const result = await pool.query(



      `INSERT INTO users (name, email, username, password, status, role, is_blocked, permissions)
       VALUES ($1, $2, $2, $3, 'active', $4, FALSE, $5::jsonb)
       RETURNING *`,
      [
        role === 'admin' ? 'Administrator' : 'Superadmin',
        normalizedEmail,
        passwordHash,
        role,
        JSON.stringify(role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : [])
      ]


      `INSERT INTO users (name, email, username, password, status, role, is_blocked)
       VALUES ($1, $2, $2, $3, 'active', $4, FALSE)
       RETURNING *`,
      [role === 'admin' ? 'Administrator' : 'Superadmin', normalizedEmail, passwordHash, role]


    );
    return userRowToRecord(result.rows[0]);
  }

  const existing = inMemoryUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (existing) {



    const wasAdmin = existing.role === 'admin';
    existing.role = role;
    existing.status = 'active';
    existing.isBlocked = false;
    if (role === 'admin' && (!wasAdmin || !Array.isArray(existing.permissions))) {
      existing.permissions = [...DEFAULT_ADMIN_PERMISSIONS];
    }


    existing.role = role;

    existing.status = 'active';
    existing.isBlocked = false;



    return { ...existing };
  }

  const passwordHash = await hashPassword(adminPassword);
  const admin = {
    id: nextUserId++,
    name: role === 'admin' ? 'Administrator' : 'Superadmin',
    email: normalizedEmail,
    username: normalizedEmail,
    password: passwordHash,
    status: 'active',
    role,
    isBlocked: false,

    permissions: role === 'admin' ? [...DEFAULT_ADMIN_PERMISSIONS] : [],


    permissions: role === 'admin' ? [...DEFAULT_ADMIN_PERMISSIONS] : [],


    createdAt: new Date().toISOString()
  };
  inMemoryUsers.unshift(admin);
  return { ...admin };
}

async function ensureAdminUser(email, password) {
  return ensurePrivilegedUser(email, password, 'admin');
}

async function ensureSuperAdminUser(email, password) {
  return ensurePrivilegedUser(email, password, 'superadmin');
}

async function updateManagedUser(userId, rawUser) {
  const name = String(rawUser.name || '').trim();
  const email = String(rawUser.email || '').trim();
  if (!name || name.length > 255 || !email || email.length > 255) {
    const error = new Error('Name and email are required and must be 255 characters or fewer.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (dbStatus === 'connected') {
    const duplicate = await pool.query(
      'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2',
      [email, userId]
    );
    if (duplicate.rowCount) {
      const error = new Error('A user with this email already exists.');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2
       WHERE id = $3 AND LOWER(COALESCE(role, 'user')) <> 'superadmin'
       RETURNING *`,
      [name, email, userId]
    );
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  }

  const user = inMemoryUsers.find((item) =>
    String(item.id) === String(userId) && String(item.role || 'user').toLowerCase() !== 'superadmin'
  );
  if (!user) {
    return null;
  }
  const duplicate = inMemoryUsers.find((item) =>
    String(item.id) !== String(userId) && item.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicate) {
    const error = new Error('A user with this email already exists.');
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  const previousEmail = user.email;
  user.name = name;
  user.email = email;
  if (!user.username || user.username === previousEmail) {
    user.username = email;
  }
  return { ...user };
}

async function setUserBlocked(userId, isBlocked) {
  if (dbStatus === 'connected') {
    const result = await pool.query(
      `UPDATE users SET is_blocked = $1
       WHERE id = $2 AND LOWER(COALESCE(role, 'user')) <> 'superadmin'
       RETURNING *`,
      [isBlocked, userId]
    );
    const user = result.rows[0] ? userRowToRecord(result.rows[0]) : null;
    if (user && isBlocked) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    }
    return user;
  }

  const user = inMemoryUsers.find((item) =>
    String(item.id) === String(userId) && String(item.role || 'user').toLowerCase() !== 'superadmin'
  );
  if (!user) {
    return null;
  }
  user.isBlocked = isBlocked;
  if (isBlocked) {
    for (const [sessionHash, session] of inMemorySessions) {
      if (String(session.userId) === String(userId)) {
        inMemorySessions.delete(sessionHash);
      }
    }
  }
  return { ...user };
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


async function createPasswordResetToken(tokenHash, userId, expiresAt) {
  if (dbStatus === 'connected') {
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()', [userId]);
    await pool.query(
      'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt]
    );
    return;
  }

  for (const [storedHash, reset] of inMemoryPasswordResets) {
    if (String(reset.userId) === String(userId) || reset.expiresAt <= Date.now()) {
      inMemoryPasswordResets.delete(storedHash);
    }
  }
  inMemoryPasswordResets.set(tokenHash, {
    userId,
    expiresAt: new Date(expiresAt).getTime()
  });
}

async function deletePasswordResetTokens(userId) {
  if (dbStatus === 'connected') {
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    return;
  }

  for (const [storedHash, reset] of inMemoryPasswordResets) {
    if (String(reset.userId) === String(userId)) {
      inMemoryPasswordResets.delete(storedHash);
    }
  }
}

async function resetPasswordWithToken(tokenHash, passwordHash) {
  if (dbStatus === 'connected') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tokenResult = await client.query(
        `SELECT user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );
      if (!tokenResult.rows[0]) {
        await client.query('ROLLBACK');
        return false;
      }

      const userId = tokenResult.rows[0].user_id;
      const updateResult = await client.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [passwordHash, userId]
      );
      if (!updateResult.rowCount) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const reset = inMemoryPasswordResets.get(tokenHash);
  if (!reset || reset.expiresAt <= Date.now()) {
    inMemoryPasswordResets.delete(tokenHash);
    return false;
  }

  const user = inMemoryUsers.find((item) => String(item.id) === String(reset.userId));
  if (!user) {
    inMemoryPasswordResets.delete(tokenHash);
    return false;
  }

  user.password = passwordHash;
  for (const [storedHash, storedReset] of inMemoryPasswordResets) {
    if (String(storedReset.userId) === String(reset.userId)) {
      inMemoryPasswordResets.delete(storedHash);
    }
  }
  for (const [sessionHash, session] of inMemorySessions) {
    if (String(session.userId) === String(reset.userId)) {
      inMemorySessions.delete(sessionHash);
    }
  }
  return true;
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


async function approvePendingUser(userId) {
  if (dbStatus === 'connected') {
    const result = await pool.query(
      `UPDATE users SET status = 'active'
       WHERE id = $1 AND status = 'pending'
         AND LOWER(COALESCE(role, 'user')) <> 'superadmin'
       RETURNING *`,
      [userId]
    );
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  }

  const user = inMemoryUsers.find((item) =>
    String(item.id) === String(userId)
    && item.status === 'pending'
    && String(item.role || 'user').toLowerCase() !== 'superadmin'
  );
  if (!user) {
    return null;
  }
  user.status = 'active';
  return { ...user };
}


async function setUserRole(userId, role, adminPermissions = DEFAULT_ADMIN_PERMISSIONS) {


async function setUserRole(userId, role, adminPermissions = DEFAULT_ADMIN_PERMISSIONS) {

async function setUserRole(userId, role) {


  if (!['user', 'admin'].includes(role)) {
    const error = new Error('Role must be user or admin.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const permissions = role === 'admin' ? normalizePermissions(adminPermissions) : [];

  if (dbStatus === 'connected') {
    const result = await pool.query(
      `UPDATE users SET role = $1, permissions = $3::jsonb
       WHERE id = $2 AND status = 'active'
         AND LOWER(COALESCE(role, 'user')) <> 'superadmin'
       RETURNING *`,
      [role, userId, JSON.stringify(permissions)]




  if (dbStatus === 'connected') {
    const result = await pool.query(
      `UPDATE users SET role = $1
       WHERE id = $2 AND status = 'active'
         AND LOWER(COALESCE(role, 'user')) <> 'superadmin'
       RETURNING *`,
      [role, userId]


    );
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  }

  const user = inMemoryUsers.find((item) =>
    String(item.id) === String(userId)
    && item.status === 'active'
    && String(item.role || 'user').toLowerCase() !== 'superadmin'
  );
  if (!user) {
    return null;
  }
  user.role = role;

  user.permissions = permissions;
  return { ...user };
}

async function setUserPermissions(userId, permissions) {
  const normalizedPermissions = normalizePermissions(permissions);
  if (
    !Array.isArray(permissions)
    || normalizedPermissions.length !== permissions.length
    || new Set(permissions).size !== permissions.length
  ) {
    const error = new Error('Permissions must contain only known, unique permission names.');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (dbStatus === 'connected') {
    const result = await pool.query(
      `UPDATE users SET permissions = $1::jsonb
       WHERE id = $2 AND LOWER(COALESCE(role, 'user')) = 'admin'
       RETURNING *`,
      [JSON.stringify(normalizedPermissions), userId]
    );
    return result.rows[0] ? userRowToRecord(result.rows[0]) : null;
  }

  const user = inMemoryUsers.find((item) =>
    String(item.id) === String(userId) && String(item.role || 'user').toLowerCase() === 'admin'
  );
  if (!user) {
    return null;
  }
  user.permissions = normalizedPermissions;
  return { ...user };
}



  return { ...user };
}




module.exports = {
  pool,
  connectDatabase,
  initializeDatabase,
  getDbStatus,
  listUsers,

  listManagedUsers,
  getUserById,
  getUserByEmail,
  createUser,
  ensureAdminUser,
  ensureSuperAdminUser,
  updateManagedUser,
  setUserBlocked,
  updateUserPassword,
  createPasswordResetToken,
  deletePasswordResetTokens,
  resetPasswordWithToken,

  createSession,
  getSession,
  deleteSession,
  updateUserStatus,
  approvePendingUser,

  setUserRole,
  setUserPermissions
};


  setUserRole,
  setUserPermissions
};

  setUserRole
};


  getUserById,
  getUserByEmail,
  createUser,
  updateUserPassword,

  createSession,
  getSession,
  deleteSession,
  updateUserStatus

};

};




