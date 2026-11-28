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

    const createAuto = await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: 'USB-C Docking Station',
      unit: 'ea'
    }, superCookie);
    assert.equal(createAuto.status, 201);
    const createdAuto = (await createAuto.json()).product;
    assert.equal(createdAuto.prodcode, 'PD0001');
    assert.equal(createdAuto.description, 'USB-C Docking Station');
    assert.equal(createdAuto.unit, 'ea');

    const createExplicit = await requestJson(`${baseUrl}/api/products`, 'POST', {
      prodcode: 'cb0001',
      description: 'Cat6 Ethernet Cable',
      unit: 'mtr'
    }, superCookie);
    assert.equal(createExplicit.status, 201);
    assert.equal((await createExplicit.json()).product.prodcode, 'CB0001');

    assert.equal((await requestJson(`${baseUrl}/api/products`, 'POST', {
      prodcode: 'CB0001',
      description: 'Duplicate Product',
      unit: 'mtr'
    }, superCookie)).status, 409);

    assert.equal((await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: '',
      unit: 'ea'
    }, superCookie)).status, 400);
    assert.equal((await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: 'Invalid Unit Item',
      unit: 'box'
    }, superCookie)).status, 400);

    const getOne = await fetch(`${baseUrl}/api/products/PD0001`, { headers: { Cookie: superCookie } });
    assert.equal(getOne.status, 200);
    assert.equal((await getOne.json()).product.description, 'USB-C Docking Station');

    const updateResp = await requestJson(`${baseUrl}/api/products/PD0001`, 'PUT', {
      description: 'USB-C Dual 4K Dock',
      unit: 'pc'
    }, superCookie);
    assert.equal(updateResp.status, 200);
    const updatedProduct = (await updateResp.json()).product;
    assert.equal(updatedProduct.description, 'USB-C Dual 4K Dock');
    assert.equal(updatedProduct.unit, 'pc');

    assert.equal((await requestJson(`${baseUrl}/api/products/ZZ9999`, 'PUT', {
      description: 'Missing Product',
      unit: 'ea'
    }, superCookie)).status, 404);

    const softDelete = await fetch(`${baseUrl}/api/products/PD0001`, {
      method: 'DELETE',
      headers: { Cookie: superCookie }
    });
    assert.equal(softDelete.status, 200);
    assert.equal((await softDelete.json()).product.status, 'Inactive');

    const activeAfterDelete = await (await fetch(`${baseUrl}/api/products?search=PD0001`, {
      headers: { Cookie: superCookie }
    })).json();
    assert.equal(activeAfterDelete.total, 0);

    const inactiveList = await (await fetch(`${baseUrl}/api/products?status=Inactive&search=PD0001`, {
      headers: { Cookie: superCookie }
    })).json();
    assert.equal(inactiveList.total, 1);
    assert.equal(inactiveList.products[0].status, 'Inactive');

    const restoreResp = await fetch(`${baseUrl}/api/products/PD0001/restore`, {
      method: 'PATCH',
      headers: { Cookie: superCookie }
    });
    assert.equal(restoreResp.status, 200);
    assert.equal((await restoreResp.json()).product.status, 'Active');

    assert.equal((await fetch(`${baseUrl}/api/products/ZZ9999`, {
      method: 'DELETE',
      headers: { Cookie: superCookie }
    })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/products/ZZ9999/restore`, {
      method: 'PATCH',
      headers: { Cookie: superCookie }
    })).status, 404);

    const pc0001Prices = await (await fetch(`${baseUrl}/api/products/PC0001/prices`, {
      headers: { Cookie: superCookie }
    })).json();
    assert.equal(pc0001Prices.total, 2);
    assert.equal(pc0001Prices.prices[0].effdate, '2010-07-12');
    assert.equal(pc0001Prices.prices[0].unitprice, 454.54);

    const pc0001Current = await (await fetch(`${baseUrl}/api/products/PC0001`, {
      headers: { Cookie: superCookie }
    })).json();
    assert.equal(pc0001Current.product.currentPrice, 454.54);
    assert.equal(pc0001Current.product.priceEffDate, '2010-07-12');

    const pc0001AsOfJune = await (await fetch(`${baseUrl}/api/products/PC0001?asOf=2010-06-01`, {
      headers: { Cookie: superCookie }
    })).json();
    assert.equal(pc0001AsOfJune.product.currentPrice, 499.99);
    assert.equal(pc0001AsOfJune.product.priceEffDate, '2010-05-15');

    assert.equal((await fetch(`${baseUrl}/api/products?asOf=not-a-date`, {
      headers: { Cookie: superCookie }
    })).status, 400);

    const addPrice = await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-01-15',
      unitprice: 525.5
    }, superCookie);
    assert.equal(addPrice.status, 201);
    assert.equal((await addPrice.json()).price.unitprice, 525.5);

    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-01-15',
      unitprice: 530
    }, superCookie)).status, 409);

    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-02-30',
      unitprice: 100
    }, superCookie)).status, 400);
    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-02-01',
      unitprice: 0
    }, superCookie)).status, 400);

    const editPrice = await requestJson(`${baseUrl}/api/products/PC0001/prices/2026-01-15`, 'PUT', {
      effdate: '2026-01-20',
      unitprice: 549.99
    }, superCookie);
    assert.equal(editPrice.status, 200);
    const editedPriceData = (await editPrice.json()).price;
    assert.equal(editedPriceData.effdate, '2026-01-20');
    assert.equal(editedPriceData.unitprice, 549.99);

    const deletePrice = await fetch(`${baseUrl}/api/products/PC0001/prices/2026-01-20`, {
      method: 'DELETE',
      headers: { Cookie: superCookie }
    });
    assert.equal(deletePrice.status, 200);

    assert.equal((await fetch(`${baseUrl}/api/products/PC0001/prices/2026-01-20`, {
      method: 'DELETE',
      headers: { Cookie: superCookie }
    })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/products/ZZ9999/prices`, {
      headers: { Cookie: superCookie }
    })).status, 404);

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

    const adminCreate = await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: 'Admin Added Item',
      unit: 'pkg'
    }, adminCookie);
    assert.equal(adminCreate.status, 201);
    const adminProdCode = (await adminCreate.json()).product.prodcode;

    const adminEdit = await requestJson(`${baseUrl}/api/products/${adminProdCode}`, 'PUT', {
      description: 'Admin Updated Item',
      unit: 'ltr'
    }, adminCookie);
    assert.equal(adminEdit.status, 200);

    const revokeWrite = await requestJson(`${baseUrl}/api/users/${admin.id}/permissions`, 'PUT', {
      permissions: ['users.view', 'products.view']
    }, superCookie);
    assert.equal(revokeWrite.status, 200);
    assert.equal((await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: 'Blocked Create',
      unit: 'ea'
    }, adminCookie)).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/products/${adminProdCode}`, 'PUT', {
      description: 'Blocked Edit',
      unit: 'ea'
    }, adminCookie)).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products/${adminProdCode}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products/${adminProdCode}/restore`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie }
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products/PC0001/prices`, {
      headers: { Cookie: adminCookie }
    })).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-03-01',
      unitprice: 100
    }, adminCookie)).status, 403);

    const granularRights = await requestJson(`${baseUrl}/api/users/${admin.id}/permissions`, 'PUT', {
      permissions: ['customers.view', 'customers.create', 'products.view', 'products.edit', 'prices.view', 'prices.create']
    }, superCookie);
    assert.equal(granularRights.status, 200);
    assert.equal((await requestJson(`${baseUrl}/api/customers`, 'POST', {
      custname: 'Granular Right Customer',
      address: '100 Rights Ave',
      payterm: '30D'
    }, adminCookie)).status, 201);
    assert.equal((await requestJson(`${baseUrl}/api/customers/C0001`, 'PUT', {
      custname: 'Denied Edit',
      address: '100 Rights Ave',
      payterm: '30D'
    }, adminCookie)).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/customers/C0001`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    })).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/products`, 'POST', {
      description: 'Denied Create',
      unit: 'ea'
    }, adminCookie)).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/products/${adminProdCode}`, 'PUT', {
      description: 'Allowed Edit Only',
      unit: 'ea'
    }, adminCookie)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/products/${adminProdCode}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    })).status, 403);
    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices`, 'POST', {
      effdate: '2026-04-01',
      unitprice: 510
    }, adminCookie)).status, 201);
    assert.equal((await requestJson(`${baseUrl}/api/products/PC0001/prices/2026-04-01`, 'PUT', {
      effdate: '2026-04-01',
      unitprice: 515
    }, adminCookie)).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/products/PC0001/prices/2026-04-01`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    })).status, 403);

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
