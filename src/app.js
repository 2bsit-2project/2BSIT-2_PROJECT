const express = require('express');
const path = require('path');
const { PORT, NODE_ENV } = require('./config/env');
const { connectDatabase, getDbStatus, listUsers, getUserById, createUser, updateUserStatus } = require('./config/db');

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
    password: String(password).trim(),
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

    if (!payload.password) {
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
