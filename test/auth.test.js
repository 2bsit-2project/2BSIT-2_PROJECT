const test = require('node:test');
const assert = require('node:assert/strict');

const { createHash } = require('node:crypto');
process.env.SUPERADMIN_EMAIL = `test-superadmin-${Date.now()}@example.com`;
process.env.SUPERADMIN_PASSWORD = 'superadmin-test-password';

const { app } = require('../src/app');
const {
  createPasswordResetToken,
  resetPasswordWithToken,
  ensureSuperAdminUser


const { createHash } = require('node:crypto');
const { app } = require('../src/app');
const {
  createPasswordResetToken,
  resetPasswordWithToken

} = require('../src/config/db');
const { hashPassword, verifyPassword } = require('../src/config/security');
const { emailConfigured } = require('../src/config/email');



const { app } = require('../src/app');
const { hashPassword, verifyPassword } = require('../src/config/security');



test('passwords are hashed and can be verified', async () => {
  const password = 'correct horse battery staple';
  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.match(passwordHash, /^scrypt\$/);
  assert.deepEqual(await verifyPassword(password, passwordHash), {
    matches: true,
    needsRehash: false
  });
  assert.deepEqual(await verifyPassword('wrong password', passwordHash), {
    matches: false,
    needsRehash: false
  });
});

test('registration, login, session check, and logout work', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const email = `auth-test-${Date.now()}@example.com`;

  try {
    const loginPage = await fetch(`${baseUrl}/login`);
    assert.equal(loginPage.status, 200);
    assert.match(await loginPage.text(), /Log in/);




    assert.equal((await fetch(`${baseUrl}/forgot-password`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/reset-password`)).status, 200);
    if (!emailConfigured) {
      const emailNotConfigured = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' })
      });
      assert.equal(emailNotConfigured.status, 503);
    }






    const registration = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Auth Test', email, password: 'test-password' })
    });
    assert.equal(registration.status, 201);
    const registrationResult = await registration.json();
    assert.equal(Object.hasOwn(registrationResult.user, 'password'), false);


    const pendingLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password' })
    });
    assert.equal(pendingLogin.status, 403);

    await ensureSuperAdminUser(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
    const superAdminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SUPERADMIN_EMAIL,
        password: process.env.SUPERADMIN_PASSWORD
      })
    });
    assert.equal(superAdminLogin.status, 200);
    const superAdminCookie = superAdminLogin.headers.get('set-cookie').split(';', 1)[0];
    const approval = await fetch(`${baseUrl}/api/superadmin/users/${registrationResult.user.id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(approval.status, 200);


    const rejectedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'incorrect' })
    });
    assert.equal(rejectedLogin.status, 401);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password' })
    });
    assert.equal(login.status, 200);
    const sessionCookie = login.headers.get('set-cookie').split(';', 1)[0];

    const session = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: sessionCookie }
    });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).authenticated, true);


    const resetToken = 'a'.repeat(64);
    const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    await createPasswordResetToken(
      resetTokenHash,
      registrationResult.user.id,
      new Date(Date.now() + 60 * 60 * 1000)
    );
    const resetResponse = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'new-test-password' })
    });
    assert.equal(resetResponse.status, 200);

    const reusedToken = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'another-password' })
    });
    assert.equal(reusedToken.status, 400);

    const expiredToken = 'b'.repeat(64);
    await createPasswordResetToken(
      createHash('sha256').update(expiredToken).digest('hex'),
      registrationResult.user.id,
      new Date(Date.now() - 1000)
    );
    const expiredReset = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredToken, password: 'another-password' })
    });
    assert.equal(expiredReset.status, 400);

    const invalidatedSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: sessionCookie }
    });
    assert.equal(invalidatedSession.status, 401);

    const oldPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password' })
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'new-test-password' })
    });
    assert.equal(newPasswordLogin.status, 200);


    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });
    assert.equal(logout.status, 200);

    const expiredSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: sessionCookie }
    });
    assert.equal(expiredSession.status, 401);


  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
