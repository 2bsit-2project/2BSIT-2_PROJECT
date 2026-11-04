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

app.get('/reg