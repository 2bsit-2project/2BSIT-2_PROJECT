const express = require('express');
const path = require('path');
const { createHash, randomBytes } = require('node:crypto');
const { PORT, NODE_ENV } = require('./config/env');
const {
  connectDatabase,
  getDbStatus,
  listManagedUsers,
  getUserById,
  getUserByEmail,
  createUser,
  ensureAdminUser,
  approvePendingUser,
  setUserRole,
  setUserPermissions,
  updateManagedUser,
  setUserBlocked,
  updateUserPassword,
  createPasswordResetToken,
  deletePasswordResetTokens,
  resetPasswordWithToken,
  createSession,
  getSession,
  deleteSession
} = require('./config/db');
const {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  normalizePermissions,
  getUserPermissions,
  getDashboardModules
} = require('./config/permissions');
const { hashPassword, verifyPassword } = require('./config/security');
const { emailConfigured, sendPasswordResetEmail } = require('./config/email');

const app = express();
const publicDirectory = path.join(process.cwd(), 'public');
let activePort = PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectory));

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
    role: user.role || 'user',
    isBlocked: Boolean(user.isBlocked),
    permissions: getUserPermissions(user),
    createdAt: user.createdAt || user.created_at || new Date().toISOString()
  };
}

const SESSION_COOKIE = 'infoman_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;

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

function requireAdminPermission(permission) {
  return async (req, res, next) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: 'Please log in to continue.' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'This account is blocked.' });
      }
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Administrator access is required.' });
      }
      if (!getUserPermissions(user).includes(permission)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action.' });
      }
      req.adminUser = user;
      return next();
    } catch (error) {
      console.error('Unable to verify administrator permission:', error.message);
      return res.status(500).json({ message: 'Unable to verify administrator permission.' });
    }
  };
}

function requireDelegatedPermission(permission) {
  return async (req, res, next) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: 'Please log in to continue.' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'This account is blocked.' });
      }
      if (user.role === 'superadmin') {
        req.permissionActor = user;
        return next();
      }
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Administrator access is required.' });
      }
      if (!getUserPermissions(user).includes(permission)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action.' });
      }
      req.permissionActor = user;
      return next();
    } catch (error) {
      console.error('Unable to verify account permission:', error.message);
      return res.status(500).json({ message: 'Unable to verify account permission.' });
    }
  };
}

function requireAuthenticatedPage(req, res, next) {
  getAuthenticatedUser(req).then((user) => {
    if (!user || user.isBlocked) {
      return res.redirect('/login');
    }
    req.pageUser = user;
    return next();
  }).catch((error) => {
    console.error('Unable to verify page access:', error.message);
    return res.status(500).send('Unable to verify page access.');
  });
}

function requireModulePage(permission, roles) {
  return (req, res, next) => {
    const user = req.pageUser;
    if (!roles.includes(user.role) || !getUserPermissions(user).includes(permission)) {
      return res.status(403).send('You do not have permission to open this module.');
    }
    return next();
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api', (req, res) => {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'homepage.html'));
});

app.get('/dashboard', requireAuthenticatedPage, (req, res) => {
  res.sendFile(path.join(publicDirectory, 'dashboard.html'));
});

app.get('/api/dashboard/modules', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Please log in to continue.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }
    return res.json({
      user: toResponseShape(user),
      modules: getDashboardModules(user)
    });
  } catch (error) {
    console.error('Unable to load dashboard modules:', error.message);
    return res.status(500).json({ message: 'Unable to load dashboard modules.' });
  }
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
  res.sendFile(path.join(publicDirectory, 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'login.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'reset-password.html'));
});

app.get(
  '/admin/users',
  requireAuthenticatedPage,
  requireModulePage('users.view', ['admin']),
  (req, res) => {
  res.sendFile(path.join(publicDirectory, 'admin-users.html'));
  }
);

app.get(
  '/superadmin/users',
  requireAuthenticatedPage,
  requireModulePage('accounts.view', ['admin', 'superadmin']),
  (req, res) => {
  res.sendFile(path.join(publicDirectory, 'superadmin-users.html'));
  }
);

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

app.post('/api/auth/password-reset/request', async (req, res) => {
  if (!emailConfigured) {
    return res.status(503).json({ message: 'Password reset email is not configured. Contact the administrator.' });
  }

  try {
    const email = String((req.body && req.body.email) || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await getUserByEmail(email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await createPasswordResetToken(
        tokenHash(token),
        user.id,
        new Date(Date.now() + PASSWORD_RESET_DURATION_MS)
      );
      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (error) {
        await deletePasswordResetTokens(user.id);
        throw error;
      }
    }

    return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (error) {
    console.error('Unable to request password reset:', error.message);
    return res.status(500).json({ message: 'Unable to send a password reset email. Please try again later.' });
  }
});

app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const token = String((req.body && req.body.token) || '');
    const password = String((req.body && req.body.password) || '');
    if (!/^[a-f\d]{64}$/i.test(token)) {
      return res.status(400).json({ message: 'A valid reset token is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const updated = await resetPasswordWithToken(tokenHash(token), await hashPassword(password));
    if (!updated) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    }

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Unable to reset password:', error.message);
    return res.status(500).json({ message: 'Unable to reset password. Please try again later.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim();
    const password = String((req.body && req.body.password) || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { matches, needsRehash } = await verifyPassword(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account is blocked. Contact an administrator.' });
    }
    if (user.status === 'pending') {
      user = await approvePendingUser(user.id) || await getUserById(user.id);
    }
    if (!user || user.status !== 'active') {
      return res.status(403).json({ message: 'This account is inactive. Contact an administrator.' });
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

app.get(['/api/users', '/users'], requireAdminPermission('users.view'), async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : null;
    const items = await listManagedUsers(status);
    res.json({
      count: items.length,
      users: items.map(toResponseShape)
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch users.', error: error.message });
  }
});

app.get(['/api/users/pending', '/users/pending'], requireAdminPermission('users.view'), async (req, res) => {
  try {
    const items = await listManagedUsers('pending');
    res.json({
      count: items.length,
      users: items.map(toResponseShape)
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch pending users.', error: error.message });
  }
});

app.get('/api/users/:id', requireAdminPermission('users.view'), async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user || String(user.role || 'user').toLowerCase() === 'superadmin') {
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
    payload.status = 'active';

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

app.get('/api/admin/users', requireAdminPermission('users.view'), async (req, res) => {
  try {
    const users = await listManagedUsers();
    return res.json({ count: users.length, users: users.map(toResponseShape) });
  } catch (error) {
    console.error('Unable to fetch managed users:', error.message);
    return res.status(500).json({ message: 'Unable to fetch users.' });
  }
});

app.post('/api/admin/users', requireAdminPermission('users.create'), async (req, res) => {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const email = String((req.body && req.body.email) || '').trim();
    const password = String((req.body && req.body.password) || '');
    if (!name || name.length > 255 || !isValidEmail(email) || email.length > 255) {
      return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const user = await createUser({ name, email, password, status: 'pending' });
    return res.status(201).json({
      message: 'User added successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    const status = error.code === 'DUPLICATE_EMAIL' ? 409 : error.code === 'VALIDATION_ERROR' ? 400 : 500;
    if (status === 500) {
      console.error('Unable to add user:', error.message);
    }
    return res.status(status).json({ message: error.message || 'Unable to add user.' });
  }
});

app.patch('/api/admin/users/:id', requireAdminPermission('users.edit'), async (req, res) => {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const email = String((req.body && req.body.email) || '').trim();
    if (!name || name.length > 255 || !isValidEmail(email) || email.length > 255) {
      return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }

    const user = await updateManagedUser(req.params.id, { name, email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ message: 'User updated successfully.', user: toResponseShape(user) });
  } catch (error) {
    const status = error.code === 'DUPLICATE_EMAIL' ? 409 : error.code === 'VALIDATION_ERROR' ? 400 : 500;
    if (status === 500) {
      console.error('Unable to update user:', error.message);
    }
    return res.status(status).json({ message: error.message || 'Unable to update user.' });
  }
});

app.patch('/api/admin/users/:id/block', requireAdminPermission('users.block'), async (req, res) => {
  try {
    const isBlocked = req.body && req.body.isBlocked;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be true or false.' });
    }
    const target = await getUserById(req.params.id);
    if (!target || String(target.role || 'user').toLowerCase() === 'superadmin') {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (target.role === 'admin') {
      return res.status(400).json({ message: 'Administrator accounts cannot be blocked.' });
    }

    const user = await setUserBlocked(req.params.id, isBlocked);
    return res.json({
      message: isBlocked ? 'User blocked successfully.' : 'User unblocked successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    console.error('Unable to change user block status:', error.message);
    return res.status(500).json({ message: 'Unable to change user block status.' });
  }
});

app.get('/api/superadmin/users', requireDelegatedPermission('accounts.view'), async (req, res) => {
  try {
    const users = await listManagedUsers();
    return res.json({
      count: users.length,
      users: users.map(toResponseShape)
    });
  } catch (error) {
    console.error('Unable to fetch Superadmin user list:', error.message);
    return res.status(500).json({ message: 'Unable to fetch users.' });
  }
});

app.patch('/api/superadmin/users/:id/approve', requireDelegatedPermission('accounts.approve'), async (req, res) => {
  try {
    const user = await approvePendingUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Pending user not found.' });
    }
    return res.json({ message: 'User approved successfully.', user: toResponseShape(user) });
  } catch (error) {
    console.error('Unable to approve user:', error.message);
    return res.status(500).json({ message: 'Unable to approve user.' });
  }
});

app.patch('/api/superadmin/users/:id/role', (req, res, next) => {
  const requestedRole = String((req.body && req.body.role) || '').trim().toLowerCase();
  const requiredPermission = requestedRole === 'user' ? 'roles.remove_admin' : 'roles.assign_admin';
  return requireDelegatedPermission(requiredPermission)(req, res, next);
}, async (req, res) => {
  try {
    const role = String((req.body && req.body.role) || '').trim().toLowerCase();
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be user or admin.' });
    }
    const target = await getUserById(req.params.id);
    if (!target || target.role === 'superadmin') {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (target.status !== 'active') {
      return res.status(400).json({ message: 'Approve the user before changing their role.' });
    }
    if (target.role === role) {
      return res.status(400).json({ message: `User already has the ${role} role.` });
    }
    const permissions = role === 'admin'
      ? req.permissionActor.role === 'superadmin'
        ? DEFAULT_ADMIN_PERMISSIONS
        : getUserPermissions(req.permissionActor)
      : [];
    const user = await setUserRole(req.params.id, role, permissions);
    if (!user) {
      return res.status(404).json({ message: 'Active user not found.' });
    }
    return res.json({
      message: role === 'admin' ? 'Administrator role assigned.' : 'Administrator role removed.',
      user: toResponseShape(user)
    });
  } catch (error) {
    console.error('Unable to change user role:', error.message);
    return res.status(500).json({ message: 'Unable to change user role.' });
  }
});

app.patch('/api/superadmin/users/:id/block', requireDelegatedPermission('accounts.block'), async (req, res) => {
  try {
    const isBlocked = req.body && req.body.isBlocked;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be true or false.' });
    }
    const target = await getUserById(req.params.id);
    if (!target || target.role === 'superadmin') {
      return res.status(404).json({ message: 'User not found.' });
    }
    const user = await setUserBlocked(req.params.id, isBlocked);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({
      message: isBlocked ? 'User blocked successfully.' : 'User unblocked successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    console.error('Unable to change user block status:', error.message);
    return res.status(500).json({ message: 'Unable to change user block status.' });
  }
});

app.patch('/api/users/:id/status', requireDelegatedPermission('accounts.approve'), async (req, res) => {
  try {
    const requestedStatus = req.body && req.body.status ? String(req.body.status).trim().toLowerCase() : 'pending';
    if (requestedStatus !== 'active') {
      return res.status(400).json({ message: 'Superadmins can approve pending accounts by setting status to active.' });
    }
    const user = await approvePendingUser(req.params.id);

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

app.get('/api/users/:id/permissions', requireDelegatedPermission('rights.manage'), async (req, res) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target || target.role !== 'admin') {
      return res.status(404).json({ message: 'Administrator not found.' });
    }
    if (req.permissionActor.role !== 'superadmin' && String(req.permissionActor.id) === String(target.id)) {
      return res.status(403).json({ message: 'You cannot change your own rights.' });
    }

    return res.json({
      user: toResponseShape(target),
      modules: PERMISSION_MODULES,
      assignablePermissions: req.permissionActor.role === 'superadmin'
        ? ALL_PERMISSIONS
        : getUserPermissions(req.permissionActor)
    });
  } catch (error) {
    console.error('Unable to fetch administrator rights:', error.message);
    return res.status(500).json({ message: 'Unable to fetch administrator rights.' });
  }
});

app.put('/api/users/:id/permissions', requireDelegatedPermission('rights.manage'), async (req, res) => {
  try {
    const requestedPermissions = req.body && req.body.permissions;
    if (!Array.isArray(requestedPermissions)) {
      return res.status(400).json({ message: 'Permissions must be an array.' });
    }
    const normalizedRequested = normalizePermissions(requestedPermissions);
    if (
      normalizedRequested.length !== requestedPermissions.length
      || new Set(requestedPermissions).size !== requestedPermissions.length
    ) {
      return res.status(400).json({ message: 'Permissions contain an unknown or duplicate action.' });
    }

    const target = await getUserById(req.params.id);
    if (!target || target.role !== 'admin') {
      return res.status(404).json({ message: 'Administrator not found.' });
    }
    const actor = req.permissionActor;
    if (actor.role !== 'superadmin' && String(actor.id) === String(target.id)) {
      return res.status(403).json({ message: 'You cannot change your own rights.' });
    }

    const assignable = actor.role === 'superadmin' ? ALL_PERMISSIONS : getUserPermissions(actor);
    if (normalizedRequested.some((permission) => !assignable.includes(permission))) {
      return res.status(403).json({ message: 'You cannot assign rights you do not have.' });
    }
    const inherited = getUserPermissions(target).filter((permission) => !assignable.includes(permission));
    const permissions = [...new Set([...inherited, ...normalizedRequested])];
    const user = await setUserPermissions(target.id, permissions);
    if (!user) {
      return res.status(404).json({ message: 'Administrator not found.' });
    }
    return res.json({
      message: 'Administrator rights updated successfully.',
      user: toResponseShape(user)
    });
  } catch (error) {
    console.error('Unable to update administrator rights:', error.message);
    return res.status(500).json({ message: 'Unable to update administrator rights.' });
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
