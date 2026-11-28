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

async function requestJson(url, method, payload, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(url, { method, headers, body: JSON.stringify(payload) });
}

test('customer list, create, edit, and permission checks work end to end', async () => {
  const admin = await ensureAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  await ensureSuperAdminUser(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const anonPage = await fetch(`${baseUrl}/customers`, { redirect: 'manual' });
    assert.equal(anonPage.status, 302);
    assert.equal(anonPage.headers.get('location'), '/login');
    const anonApi = await fetch(`${baseUrl}/api/customers`);
    assert.equal(anonApi.status, 401);

    const superLogin = await requestJson(`${baseUrl}/api/auth/login`, 'POST', {
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD
    });
    assert.equal(superLogin.status, 200);
    const superCookie = superLogin.headers.get('set-cookie').split(';', 1)[0];

    const superPage = await fetch(`${baseUrl}/customers`, { headers: { Cookie: superCookie } });
    assert.equal(superPage.status, 200);
    const html = await superPage.text();
    assert.match(html, /Customer Directory/);
    assert.match(html, /customer-form/);

    const allResp = await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: superCookie } });
    assert.equal(allResp.status, 200);
    const allData = await allResp.json();
    assert.equal(allData.total, 29);
    assert.equal(allData.customers[0].custno, 'C0001');
    assert.equal(allData.customers[0].custname, 'Globus Medical, Inc');
    const byName = await (await fetch(`${baseUrl}/api/customers?search=Globus`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byName.total, 1);
    assert.equal(byName.customers[0].custno, 'C0001');

    const byCode = await (await fetch(`${baseUrl}/api/customers?search=c0003`, { headers: { Cookie: superCookie } })).json();
    assert.equal(byCode.total, 1);
    assert.equal(byCode.customers[0].custname, 'Trisha Macdowell');

    const codOnly = await (await fetch(`${baseUrl}/api/customers?payterm=COD`, { headers: { Cookie: superCookie } })).json();
    assert.ok(codOnly.total > 0);
    assert.ok(codOnly.customers.every((c) => c.payterm === 'COD'));

    const combined = await (await fetch(`${baseUrl}/api/customers?search=San%20Diego&payterm=45D`, { headers: { Cookie: superCookie } })).json();
    assert.equal(combined.total, 1);
    assert.equal(combined.customers[0].custno, 'C0002');

    const badTerm = await fetch(`${baseUrl}/api/customers?payterm=90D`, { headers: { Cookie: superCookie } });
    assert.equal(badTerm.status, 400);
    const badStatus = await fetch(`${baseUrl}/api/customers?status=deleted`, { headers: { Cookie: superCookie } });
    assert.equal(badStatus.status, 400);

    const createAuto = await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: 'Northstar Logistics',
      address: '100 Harbor Blvd, Long Beach, CA 90802',
      payterm: '30D'
    }, superCookie);
    assert.equal(createAuto.status, 201);
    const createdAutoData = await createAuto.json();
    assert.equal(createdAutoData.customer.custno, 'C0030');
    assert.equal(createdAutoData.customer.custname, 'Northstar Logistics');
    assert.equal(createdAutoData.customer.payterm, '30D');

    const createExplicit = await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custno: 'c0099',
      custname: 'Pacific Coast Supply',
      address: '550 Market St, San Francisco, CA 94104',
      payterm: 'COD'
    }, superCookie);
    assert.equal(createExplicit.status, 201);
    assert.equal((await createExplicit.json()).customer.custno, 'C0099');

    const duplicateCreate = await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custno: 'C0099',
      custname: 'Duplicate Customer',
      address: '123 Main St',
      payterm: '45D'
    }, superCookie);
    assert.equal(duplicateCreate.status, 409);

    const invalidCreate = await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: '',
      address: '123 Main St',
      payterm: '30D'
    }, superCookie);
    assert.equal(invalidCreate.status, 400);
    const getOne = await fetch(`${baseUrl}/api/customers/C0030`, { headers: { Cookie: superCookie } });
    assert.equal(getOne.status, 200);
    assert.equal((await getOne.json()).customer.custname, 'Northstar Logistics');

    const updateResp = await requestJson(`${baseUrl}/api/customers/C0030`, 'PUT', {
      custname: 'Northstar Logistics Corp',
      address: '200 Harbor Blvd, Long Beach, CA 90802',
      payterm: '45D'
    }, superCookie);
    assert.equal(updateResp.status, 200);
    const updatedData = await updateResp.json();
    assert.equal(updatedData.customer.custname, 'Northstar Logistics Corp');
    assert.equal(updatedData.customer.payterm, '45D');

    const missingUpdate = await requestJson(`${baseUrl}/api/customers/C9999`, 'PUT', {
      custname: 'Missing',
      address: 'Nowhere',
      payterm: '30D'
    }, superCookie);
    assert.equal(missingUpdate.status, 404);

    const userEmail = `cust-user-${Date.now()}@example.com`;
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
    assert.equal(userLogin.status, 200);
    const userCookie = userLogin.headers.get('set-cookie').split(';', 1)[0];

    assert.equal((await fetch(`${baseUrl}/customers`, { headers: { Cookie: userCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: userCookie } })).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: 'Blocked',
      address: 'Blocked St',
      payterm: 'COD'
    }, userCookie)).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/customers/C0001`, 'PUT', {
      custname: 'Blocked',
      address: 'Blocked St',
      payterm: 'COD'
    }, userCookie)).status, 403);

    const adminLogin = await requestJson(`${baseUrl}/api/auth/login`, 'POST', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie').split(';', 1)[0];
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: adminCookie } })).status, 200);

    const adminCreate = await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: 'Admin Added Co',
      address: '10 Admin Way',
      payterm: '30D'
    }, adminCookie);
    assert.equal(adminCreate.status, 201);
    const adminCreatedCode = (await adminCreate.json()).customer.custno;

    const adminEdit = await requestJson(`${baseUrl}/api/customers/${adminCreatedCode}`, 'PUT', {
      custname: 'Admin Edited Co',
      address: '20 Admin Way',
      payterm: '45D'
    }, adminCookie);
    assert.equal(adminEdit.status, 200);

    const revoke = await requestJson(`${baseUrl}/api/users/${admin.id}/permissions`, 'PUT', {
      permissions: ['users.view', 'customers.view']
    }, superCookie);
    assert.equal(revoke.status, 200);
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: adminCookie } })).status, 200);
    assert.equal((await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: 'No Create Right',
      address: '10 Denied St',
      payterm: 'COD'
    }, adminCookie)).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/customers/${adminCreatedCode}`, 'PUT', {
      custname: 'No Edit Right',
      address: '10 Denied St',
      payterm: 'COD'
    }, adminCookie)).status, 403);

    const revokeAll = await requestJson(`${baseUrl}/api/users/${admin.id}/permissions`, 'PUT', {
      permissions: ['users.view']
    }, superCookie);
    assert.equal(revokeAll.status, 200);
    assert.equal((await fetch(`${baseUrl}/customers`, { headers: { Cookie: adminCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: adminCookie } })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
