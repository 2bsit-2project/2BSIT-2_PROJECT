const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_EMAIL = `test-admin-${Date.now()}@example.com`;
process.env.ADMIN_PASSWORD = 'admin-test-password';
process.env.SUPERADMIN_EMAIL = `test-superadmin-${Date.now()}@example.com`;
process.env.SUPERADMIN_PASSWORD = 'superadmin-test-password';

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
  const superAdmin = await ensureSuperAdminUser(
    process.env.SUPERADMIN_EMAIL,
    process.env.SUPERADMIN_PASSWORD
  );
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const page = await fetch(`${baseUrl}/admin/users`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /User management/);
    const superAdminPage = await fetch(`${baseUrl}/superadmin/users`);
    assert.equal(superAdminPage.status, 200);
    assert.match(await superAdminPage.text(), /Superadmin console/);

    const anonymousList = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(anonymousList.status, 401);
    const anonymousSuperAdminList = await fetch(`${baseUrl}/api/superadmin/users`);
    assert.equal(anonymousSuperAdminList.status, 401);
    const anonymousLegacyList = await fetch(`${baseUrl}/api/users`);
    assert.equal(anonymousLegacyList.status, 401);

    const adminLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie').split(';', 1)[0];
    const adminApprovalAttempt = await fetch(`${baseUrl}/api/superadmin/users/1/approve`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie }
    });
    assert.equal(adminApprovalAttempt.status, 403);

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

    const superAdminLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD
    });
    assert.equal(superAdminLogin.status, 200);
    const superAdminCookie = superAdminLogin.headers.get('set-cookie').split(';', 1)[0];
    const superAdminUsers = await fetch(`${baseUrl}/api/superadmin/users`, {
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(superAdminUsers.status, 200);
    const superAdminUserList = (await superAdminUsers.json()).users;
    assert.equal(superAdminUserList.some((user) => user.id === createdUser.id), true);
    assert.equal(superAdminUserList.some((user) => user.id === superAdmin.id), false);

    const pendingLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(pendingLogin.status, 403);
    const approval = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(approval.status, 200);
    assert.equal((await approval.json()).user.status, 'active');

    const promoteAdmin = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(promoteAdmin.status, 200);
    assert.equal((await promoteAdmin.json()).user.role, 'admin');

    const promotedLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(promotedLogin.status, 200);
    const promotedCookie = promotedLogin.headers.get('set-cookie').split(';', 1)[0];
    const blockAdmin = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ isBlocked: true })
    });
    assert.equal(blockAdmin.status, 200);
    const revokedAdminSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: promotedCookie }
    });
    assert.equal(revokedAdminSession.status, 401);
    const blockedAdminLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(blockedAdminLogin.status, 403);
    const unblockAdmin = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ isBlocked: false })
    });
    assert.equal(unblockAdmin.status, 200);

    const demoteAdmin = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(demoteAdmin.status, 200);
    assert.equal((await demoteAdmin.json()).user.role, 'user');

    const hiddenSuperadminApproval = await fetch(`${baseUrl}/api/superadmin/users/${superAdmin.id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(hiddenSuperadminApproval.status, 404);

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
      body: JSON.stringify({ name: 'Changed Superadmin', email: process.env.SUPERADMIN_EMAIL })
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
