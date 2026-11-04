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
  ensureDefaultUser,
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
  const defaultUser = await ensureDefaultUser(
    `default-user-${Date.now()}@example.com`,
    'default-user-test-password'
  );
  assert.equal(defaultUser.role, 'user');
  assert.equal(defaultUser.status, 'active');

  await ensureAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const superAdmin = await ensureSuperAdminUser(
    process.env.SUPERADMIN_EMAIL,
    process.env.SUPERADMIN_PASSWORD
  );
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const homepage = await fetch(`${baseUrl}/`);
    assert.equal(homepage.status, 200);
    assert.match(await homepage.text(), /One platform\. Every possibility\./);
    const anonymousDashboard = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
    assert.equal(anonymousDashboard.status, 302);
    assert.equal(anonymousDashboard.headers.get('location'), '/login');
    const anonymousDashboardModules = await fetch(`${baseUrl}/api/dashboard/modules`);
    assert.equal(anonymousDashboardModules.status, 401);
    const page = await fetch(`${baseUrl}/admin/users`, { redirect: 'manual' });
    assert.equal(page.status, 302);
    const anonymousSuperAdminPage = await fetch(`${baseUrl}/superadmin/users`, { redirect: 'manual' });
    assert.equal(anonymousSuperAdminPage.status, 302);

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
    const adminUser = (await adminLogin.json()).user;
    const adminDashboard = await fetch(`${baseUrl}/dashboard`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(adminDashboard.status, 200);
    assert.match(await adminDashboard.text(), /Quick Actions/);
    const adminModulesResponse = await fetch(`${baseUrl}/api/dashboard/modules`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(adminModulesResponse.status, 200);
    const adminModules = (await adminModulesResponse.json()).modules;
    assert.deepEqual(adminModules.map((module) => module.id), ['users', 'rights']);
    assert.equal(adminModules[1].href, '/admin/users#rights');
    const allowedAdminPage = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(allowedAdminPage.status, 200);
    const deniedAccountPage = await fetch(`${baseUrl}/superadmin/users`, {
      headers: { Cookie: adminCookie },
      redirect: 'manual'
    });
    assert.equal(deniedAccountPage.status, 403);
    const selfRights = await fetch(`${baseUrl}/api/users/${adminUser.id}/permissions`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(selfRights.status, 403);
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
    const superAdminPage = await fetch(`${baseUrl}/superadmin/users`, {
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(superAdminPage.status, 200);
    assert.match(await superAdminPage.text(), /Superadmin console/);
    const superAdminModulesResponse = await fetch(`${baseUrl}/api/dashboard/modules`, {
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(superAdminModulesResponse.status, 200);
    const superAdminDashboardModules = (await superAdminModulesResponse.json()).modules;
    assert.deepEqual(superAdminDashboardModules.map((module) => module.id), [
      'users', 'accounts', 'roles', 'rights'
    ]);
    assert.equal(superAdminDashboardModules[0].href, '/superadmin/users#accounts');
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
    assert.equal(pendingLogin.status, 200);
    assert.equal((await pendingLogin.json()).user.status, 'active');

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

    const adminRights = await fetch(`${baseUrl}/api/users/${createdUser.id}/permissions`, {
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(adminRights.status, 200);
    const rightsDialog = await adminRights.json();
    assert.ok(rightsDialog.modules.some((module) => module.id === 'users'));
    assert.ok(rightsDialog.modules.some((module) => module.id === 'roles'));
    assert.ok(rightsDialog.assignablePermissions.includes('roles.assign_admin'));

    const invalidRights = await fetch(`${baseUrl}/api/users/${createdUser.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ permissions: ['users.delete'] })
    });
    assert.equal(invalidRights.status, 400);

    const restrictedRights = await fetch(`${baseUrl}/api/users/${createdUser.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ permissions: ['users.view'] })
    });
    assert.equal(restrictedRights.status, 200);

    const escalatedRights = await fetch(`${baseUrl}/api/users/${createdUser.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ permissions: ['accounts.approve'] })
    });
    assert.equal(escalatedRights.status, 403);

    const promotedLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: createdUser.email,
      password: 'managed-user-password'
    });
    assert.equal(promotedLogin.status, 200);
    const promotedCookie = promotedLogin.headers.get('set-cookie').split(';', 1)[0];
    const allowedList = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: promotedCookie }
    });
    assert.equal(allowedList.status, 200);
    const deniedCreate = await postJson(`${baseUrl}/api/admin/users`, {
      name: 'Denied User',
      email: `denied-${Date.now()}@example.com`,
      password: 'managed-user-password'
    }, promotedCookie);
    assert.equal(deniedCreate.status, 403);

    const delegatedRights = await fetch(`${baseUrl}/api/users/${createdUser.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({
        permissions: ['users.view', 'accounts.view', 'accounts.approve', 'roles.assign_admin', 'rights.manage']
      })
    });
    assert.equal(delegatedRights.status, 200);
    const delegatedDashboardModules = await fetch(`${baseUrl}/api/dashboard/modules`, {
      headers: { Cookie: promotedCookie }
    });
    assert.equal(delegatedDashboardModules.status, 200);
    assert.deepEqual(
      (await delegatedDashboardModules.json()).modules.map((module) => module.id),
      ['users', 'accounts', 'roles', 'rights']
    );
    const delegatedAccountPage = await fetch(`${baseUrl}/superadmin/users`, {
      headers: { Cookie: promotedCookie }
    });
    assert.equal(delegatedAccountPage.status, 200);
    const redundantRoleChange = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superAdminCookie
      },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(redundantRoleChange.status, 400);
    const delegatedAccountList = await fetch(`${baseUrl}/api/superadmin/users`, {
      headers: { Cookie: promotedCookie }
    });
    assert.equal(delegatedAccountList.status, 200);
    const promotableUserResponse = await postJson(`${baseUrl}/api/admin/users`, {
      name: 'Delegated Admin',
      email: `delegated-${Date.now()}@example.com`,
      password: 'delegated-user-password'
    }, adminCookie);
    assert.equal(promotableUserResponse.status, 201);
    const promotableUser = (await promotableUserResponse.json()).user;
    const approvePromotable = await fetch(`${baseUrl}/api/superadmin/users/${promotableUser.id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: superAdminCookie }
    });
    assert.equal(approvePromotable.status, 200);
    const delegatedPromotion = await fetch(`${baseUrl}/api/superadmin/users/${promotableUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: promotedCookie
      },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(delegatedPromotion.status, 200);
    assert.deepEqual(
      (await delegatedPromotion.json()).user.permissions,
      ['users.view', 'accounts.view', 'accounts.approve', 'roles.assign_admin', 'rights.manage']
    );
    const deniedBlockAdmin = await fetch(`${baseUrl}/api/superadmin/users/${createdUser.id}/block`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: promotedCookie
      },
      body: JSON.stringify({ isBlocked: true })
    });
    assert.equal(deniedBlockAdmin.status, 403);

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
    const regularDashboardModules = await fetch(`${baseUrl}/api/dashboard/modules`, {
      headers: { Cookie: regularCookie }
    });
    assert.equal(regularDashboardModules.status, 200);
    assert.deepEqual((await regularDashboardModules.json()).modules, []);
    const regularPage = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: regularCookie },
      redirect: 'manual'
    });
    assert.equal(regularPage.status, 403);
    const forbiddenList = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: regularCookie }
    });
    assert.equal(forbiddenList.status, 403);
    const forbiddenRights = await fetch(`${baseUrl}/api/users/${superAdmin.id}/permissions`, {
      headers: { Cookie: regularCookie }
    });
    assert.equal(forbiddenRights.status, 403);

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
