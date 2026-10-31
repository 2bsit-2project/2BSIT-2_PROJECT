const express = require('express');
const path = require('path');
const { createHash, randomBytes } = require('node:crypto');
const { PORT, NODE_ENV } = require('./config/env');
const {
  connectDatabase,
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
} = require('./config/db');
const { hashPassword, verifyPassword } = require('./config/security');

const app = express();
let activePort = PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function normalizeUserPayload(payload = {}) {
  const raw = payload && typeof payload === 'object' ? payload : {};
  const nested = raw.user && typeof raw.user === 'object' ? raw.user : {};
  const source = { ...raw, ...nested };

  const firstName = source.firstName || source.first_name || '';
  const lastName = source.lastName || source.last_name || '';
  const name = source.name || source.fullName || [firstName, lastName].filter(Boolean).join(' ') || '';
  const email = source.email || source.userEmail || source.user_email || '';
  const username = source.username || source.userName || source.user_name || email || '';
  const password = source.password || source.userPassword || source.user_password || '';
  const status = source.status || 'pending';

  return {
    name: String(name || username || 'User').trim(),
    email: String(email).trim(),
    username: String(username || email || name || '').trim(),
    password: String(password),
    status: String(status).trim().toLowerCase() || 'pending'
  };
}

function toResponseShape(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || user.email,
    status: user.status || 'pending',
    createdAt: user.createdAt || user.created_at || new Date().toISOString()
  };
}

const SESSION_COOKIE = 'infoman_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
  return /^[a-f\d]{64}$/i.test(token) ? token : null;
}

function sessionCookieOptions() {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${NODE_ENV === 'production' ? '; Secure' : ''}`;
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function getAuthenticatedUser(req) {
  const token = getSessionToken(req);
  if (!token) {
    return null;
  }

  const session = await getSession(tokenHash(token));
  return session ? getUserById(session.userId) : null;
}

app.get('/', (req, res) => {
  res.json({
    name: 'InfoMan',
    status: 'ok',
    environment: NODE_ENV,
    port: activePort,
    message: 'Project scaffold is ready.',
    registration: {
      endpoint: '/api/users',
      form: '/register'
    }
  });
});

app.get('/health', async (req, res) => {
  const dbStatus = getDbStatus();

  res.json({
    status: 'ok',
    environment: NODE_ENV,
    port: activePort,
    database: dbStatus
  });
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ authenticated: false, message: 'Not logged in.' });
    }

    return res.json({ authenticated: true, user: toResponseShape(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to check session.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim();
    const password = String((req.body && req.body.password) || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { matches, needsRehash } = await verifyPassword(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (needsRehash) {
      await updateUserPassword(user.id, await hashPassword(password));
    }

    const token = randomBytes(32).toString('hex');
    await createSession(tokenHash(token), user.id, new Date(Date.now() + SESSION_DURATION_MS));
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${sessionCookieOptions()}`);
    return res.json({ message: 'Logged in successfully.', user: toResponseShape(user) });
  } catch (error) {
    console.error('Unable to log in user:', error.message);
    return res.status(500).json({ message: 'Unable to log in.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getSessionToken(req);
    if (token) {
      await deleteSession(tokenHash(token));
    }
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${sessionCookieOptions().replace(/Max-Age=\d+/, 'Max-Age=0')}`);
    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Unable to log out user:', error.message);
    return res.status(500).json({ message: 'Unable to log out.' });
  }
});

app.get(['/api/users', '/users'], async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : null;
    const items = await listUsers(status);
    res.json({
      count: items.length,
      users: items.map(toResponseShape)
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch users.', error: error.message });
  }
});

app.get(['/api/users/pending', '/users/pending'], async (req, res) => {
  try {
    const items = await listUsers('pending');
    res.json({
      count: items.length,
      users: items.map(toResponseShape)
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch pending users.', error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: toResponseShape(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch user.', error: error.message });
  }
});

async function registerUser(req, res) {
  try {
    const payload = normalizeUserPayload(req.body || {});

    if (!payload.email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (!payload.password.trim()) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const user = await createUser(payload);

    return res.status(201).json({
      message: 'User registered successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    const status = error.code === 'DUPLICATE_EMAIL' ? 409 : error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({
      message: error.message || 'Unable to register user.',
      error: error.code || 'REGISTRATION_FAILED'
    });
  }
}

app.post(['/api/users', '/api/users/register', '/api/register', '/users/register', '/register'], registerUser);

app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const requestedStatus = req.body && req.body.status ? String(req.body.status).trim().toLowerCase() : 'pending';
    const user = await updateUserStatus(req.params.id, requestedStatus);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      message: 'User status updated successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update user status.', error: error.message });
  }
});

async function startServer() {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const tryListen = (port) => {
      const server = app.listen(port, () => {
        activePort = port;
        console.log(`Server running on http://localhost:${port}`);
        resolve(server);
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = port + 1;
          if (nextPort <= port + 20) {
            console.warn(`Port ${port} is unavailable. Retrying on ${nextPort}.`);
            tryListen(nextPort);
            return;
          }
        }

        reject(error);
      });
    };

    tryListen(PORT);
  });
}

module.exports = {
  app,
  startServer,
  getServerPort: () => activePort
};
