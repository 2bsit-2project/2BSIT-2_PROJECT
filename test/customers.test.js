const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.ADMIN_EMAIL = 'cust-admin@example.com';
process.env.ADMIN_PASSWORD = 'admin-password-123';
process.env.SUPERADMIN_EMAIL = 'cust-superadmin@example.com';
process.env.SUPERADMIN_PASSWORD = 'superadmin-password-123';

const { app } = require('../src/app');
const { ensureAdminUser, ensureSuperAdminUser } = require('../src/config/db');

async function postJson(url, payload, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
}

test('customer list supports search, payment term filter, and server-side permission checks', async () => {
  const admin = await ensureAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  await ensureSuperAdminUser(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Unauthenticated requests are blocked
    const anonPage = await fetch(`${baseUrl}/customers`, { redirect: 'manual' });
    assert.equal(anonPage.status, 302);
    assert.equal(anonPage.headers.get('location'), '/login');
    const anonApi = await fetch(`${baseUrl}/api/customers`);
    assert.equal(anonApi.status, 401);

    // 2. Superadmin can open page and list all 29 HopeDB customers
    const superLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD
    });
    assert.equal(superLogin.status, 200);
    const superCookie = superLogin.headers.get('set-cookie').split(';', 1)[0];

    const superPage = await fetch(`${baseUrl}/customers`, { headers: { Cookie: superCookie } });
    assert.equal(superPage.status, 200);
    assert.match(await superPage.text(), /Customer Directory/);

    const allResp = await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: superCookie } });
    assert.equal(allResp.status, 200);
    const allData = await allResp.json();
    assert.equal(allData.total, 29);
    assert.equal(allData.customers[0].custno, 'C0001');
    assert.equal(allData.customers[0].custname, 'Globus Medical, Inc');

    // 3. Search by name, custno, and address
    const byName = await (await fetch(`${baseUrl}/api/customers?search=Globus`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byName.total, 1);
    assert.equal(byName.customers[0].custno, 'C0001');

    const byCode = await (await fetch(`${baseUrl}/api/customers?search=c0003`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byCode.total, 1);
    assert.equal(byCode.customers[0].custname, 'Trisha Macdowell');

    // 4. Filter by payment term and combined search + payterm
    const codOnly = await (await fetch(`${baseUrl}/api/customers?payterm=COD`, { headers: { Cookie: superCookie } })).json();
    assert.ok(codOnly.total > 0);
    assert.ok(codOnly.customers.every((c) => c.payterm === 'COD'));

    const combined = await (await fetch(`${baseUrl}/api/customers?search=San%20Diego&payterm=45D`, { headers: { Cookie: superCookie } })).json();
    assert.equal(combined.total, 1);
    assert.equal(combined.customers[0].custno, 'C0002');

    // 5. Invalid filters return 400
    const badTerm = await fetch(`${baseUrl}/api/customers?payterm=90D`, { headers: { Cookie: superCookie } });
    assert.equal(badTerm.status, 400);
    const badStatus = await fetch(`${baseUrl}/api/customers?status=deleted`, { headers: { Cookie: superCookie } });
    assert.equal(badStatus.status, 400);

    // 6. Regular approved user cannot access /customers or /api/customers
    const userEmail = `cust-user-${Date.now()}@example.com`;
    const regResp = await postJson(`${baseUrl}/api/users`, {
      name: 'Regular User',
      email: userEmail,
      password: 'regular-password-123'
    });
    assert.equal(regResp.status, 201);
    const regUser = (await regResp.json()).user;
    await fetch(`${baseUrl}/api/superadmin/users/${regUser.id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: superCookie }
    });
    const userLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: userEmail,
      password: 'regular-password-123'
    });
    assert.equal(userLogin.status, 200);
    const userCookie = userLogin.headers.get('set-cookie').split(';', 1)[0];

    assert.equal((await fetch(`${baseUrl}/customers`, { headers: { Cookie: userCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: userCookie } })).status, 403);

    // 7. Admin with customers.view can access; revoking customers.view blocks access
    const adminLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie').split(';', 1)[0];
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: adminCookie } })).status, 200);

    const revoke = await fetch(`${baseUrl}/api/users/${admin.id}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: superCookie },
      body: JSON.stringify({ permissions: ['users.view'] })
    });
    assert.equal(revoke.status, 200);
    assert.equal((await fetch(`${baseUrl}/customers`, { headers: { Cookie: adminCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: adminCookie } })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
