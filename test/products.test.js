const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.ADMIN_EMAIL = 'prod-admin@example.com';
process.env.ADMIN_PASSWORD = 'admin-password-123';
process.env.SUPERADMIN_EMAIL = 'prod-superadmin@example.com';
process.env.SUPERADMIN_PASSWORD = 'superadmin-password-123';

const { app } = require('../src/app');
const { ensureAdminUser, ensureSuperAdminUser } = require('../src/config/db');

async function requestJson(url, method, payload, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(url, { method, headers, body: JSON.stringify(payload) });
}

test('product list supports search, unit filter, and permission checks', async () => {
  const admin = await ensureAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  await ensureSuperAdminUser(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const anonPage = await fetch(`${baseUrl}/products`, { redirect: 'manual' });
    assert.equal(anonPage.status, 302);
    assert.equal(anonPage.headers.get('location'), '/login');
    const anonApi = await fetch(`${baseUrl}/api/products`);
    assert.equal(anonApi.status, 401);

    const superLogin = await requestJson(`${baseUrl}/api/auth/login`, 'POST', {
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD
    });
    assert.equal(superLogin.status, 200);
    const superCookie = superLogin.headers.get('set-cookie').split(';', 1)[0];

    const superPage = await fetch(`${baseUrl}/products`, { headers: { Cookie: superCookie } });
    assert.equal(superPage.status, 200);
    assert.match(await superPage.text(), /Product Catalog/);

    const allResp = await fetch(`${baseUrl}/api/products`, { headers: { Cookie: superCookie } });
    assert.equal(allResp.status, 200);
    const allData = await allResp.json();
    assert.equal(allData.total, 57);
    assert.equal(allData.products[0].prodcode, 'AD0001');
    assert.equal(allData.products[0].description, 'Toshiba Canvio 1 TB');

    const byName = await (await fetch(`${baseUrl}/api/products?search=Toshiba`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byName.total, 1);
    assert.equal(byName.products[0].prodcode, 'AD0001');

    const byCode = await (await fetch(`${baseUrl}/api/products?search=nb0005`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byCode.total, 1);
    assert.equal(byCode.products[0].description, 'Apple Mac Pro Laptop');

    const pcOnly = await (await fetch(`${baseUrl}/api/products?unit=pc`, { headers: { Cookie: superCookie } })).json();
    assert.ok(pcOnly.total > 0);
    assert.ok(pcOnly.products.every((p) => p.unit === 'pc'));

    const combined = await (await fetch(`${baseUrl}/api/products?search=Dell&unit=ea`, { headers: { Cookie: superCookie } })).json();
    assert.ok(combined.total >= 3);
    assert.ok(combined.products.every((p) => p.unit === 'ea' && p.description.toLowerCase().includes('dell')));

    assert.equal((await fetch(`${baseUrl}/api/products?unit=box`, { headers: { Cookie: superCookie } })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/products?status=archived`, { headers: { Cookie: superCookie } })).status, 400);

    const userEmail = `prod-user-${Date.now()}@example.com`;
    const regResp = await requestJson(`${baseUrl}/api/users`, 'POST', {
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
    const userLogin = await requestJson(`${baseUrl}/api/auth/login`, 'POST', {
      email: userEmail,
      password: 'regular-password-123'
    });
    const userCookie = userLogin.headers.get('set-cookie').split(';', 1)[0];
    assert.equal((await fetch(`${baseUrl}/products`, { headers: { Cookie: userCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products`, { headers: { Cookie: userCookie } })).status, 403);

    const adminLogin = await requestJson(`${baseUrl}/api/auth/login`, 'POST', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    const adminCookie = adminLogin.headers.get('set-cookie').split(';', 1)[0];
    assert.equal((await fetch(`${baseUrl}/api/products`, { headers: { Cookie: adminCookie } })).status, 200);

    const revoke = await requestJson(`${baseUrl}/api/users/${admin.id}/permissions`, 'PUT', {
      permissions: ['users.view']
    }, superCookie);
    assert.equal(revoke.status, 200);
    assert.equal((await fetch(`${baseUrl}/products`, { headers: { Cookie: adminCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products`, { headers: { Cookie: adminCookie } })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
