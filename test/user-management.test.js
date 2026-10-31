const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_EMAIL = `test-admin-${Date.now()}@example.com`;
process.env.ADMIN_PASSWORD = 'admin-test-password';

const { app } = require('../src/app');
const {
  ensureAdminUser,
  ensureSuperAdminUser,
  listManagedUsers
} = require('../src/config/db');

async function postJson(url, body, cookie) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

test('admin can manage users while regular users cannot', async () => {
  await ensureAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const page = await fetch(`${baseUrl}/admin/users`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /User management/);

    const anonymousList = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(anonymousList.status, 401);
    const anonymousLegacyList = await fetch(`${baseUrl}/api/users`);
    assert.equal(anonymousLegacyList.status, 401);

    const adminLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie').split(';', 1)[0];

    const userCreation = await postJson(`${baseUrl}/api/admin/users`, {
      name: 'Managed User',
      email: `managed-${Date.now()}@example.com`,
      password: 'managed-user-password',
      role: 'admin',
      status: 'active'
    }, adminCookie);
    assert.equal(userCreation.status, 201);
    const createdUser = (await userCreation.json()).user;
    assert.equal(createdUser.role, 'user');
    assert.equal(createdUser.status, 'pending');
    assert.equal(createdUser.isBlocked, false);
    assert.equal(Object.hasOwn(createdUser, 'password'), false);

    const superAdminEmail = `hidden-superadmin-${Date.now()}@example.com`;
    const superAdmin = await ensureSuperAdminUser(superAdminEmail, 'superadmin-test-password');
    const managedUsers = await listManagedUsers();
    assert.equal(managedUsers.some((user) => user.id === superAdmin.id), false);

    const duplicateUserResponse = await postJson(`${baseUrl}/api/admin/users`, {
      name: 'Duplicate User',
      email: createdUser.email.toUpperCase(),
      password: 'another-user-password'
    }, adminCookie);
    assert.equal(duplicateUserResponse.status, 409);

    const updatedUserResponse = await fetch(`${baseUrl}/api/admin/users/${createdUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ name: 'Updated User', email: createdUser.email })
    });
    assert.equal(updatedUserResponse.status, 200);
    assert.equal((await updatedUserResponse.json()).user.name, 'Updated User');

    const listResponse = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(listResponse.status, 200);
    const listedUsers = (await listResponse.json()).users;
    assert.equal(listedUsers.some((user) => user.id === createdUser.id), true);
    assert.equal(listedUsers.some((user) => user.id === superAdmin.id), false);

    const hiddenSuperadminDetail = await fetch(`${baseUrl}/api/users/${superAdmin.id}`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(hiddenSuperadminDetail.status, 404);

    const hiddenSuperadminUpdate = await fetch(`${baseUrl}/api/admin/users/${superAdmin.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ name: 'Changed Superadmin', email: superAdminEmail })
    });
    assert.equal(hiddenSuperadminUpdate.status, 404);

    const hiddenSuperadminBlock = await fetch(`${baseUrl}/api/admin/users/${superAdmin.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ isBlocked: true })
    });
    assert.equal(hiddenSuperadminBlock.status, 404);

    const regularLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(regularLogin.status, 200);
    const regularCookie = regularLogin.headers.get('set-cookie').split(';', 1)[0];
    const forbiddenList = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: regularCookie }
    });
    assert.equal(forbiddenList.status, 403);

    const blockResponse = await fetch(`${baseUrl}/api/admin/users/${createdUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ isBlocked: true })
    });
    assert.equal(blockResponse.status, 200);
    assert.equal((await blockResponse.json()).user.isBlocked, true);
    const revokedSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: regularCookie }
    });
    assert.equal(revokedSession.status, 401);

    const blockedLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(blockedLogin.status, 403);

    const unblockResponse = await fetch(`${baseUrl}/api/admin/users/${createdUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ isBlocked: false })
    });
    assert.equal(unblockResponse.status, 200);
    assert.equal((await unblockResponse.json()).user.isBlocked, false);

    const adminUser = (await adminLogin.json()).user;
    const selfBlockResponse = await fetch(`${baseUrl}/api/admin/users/${adminUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ isBlocked: true })
    });
    assert.equal(selfBlockResponse.status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
