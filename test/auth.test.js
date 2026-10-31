const test = require('node:test');
const assert = require('node:assert/strict');
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

    const registration = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Auth Test', email, password: 'test-password' })
    });
    assert.equal(registration.status, 201);
    const registrationResult = await registration.json();
    assert.equal(Object.hasOwn(registrationResult.user, 'password'), false);

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
