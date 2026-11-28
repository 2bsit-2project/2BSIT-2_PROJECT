Sprint 2 Test Cases: Per-Right Permission Tests

Task: S2-TST-04
Project: Hope, Inc. ERP

1. Test Cases: Customer Module Action Rights
- TC-PR-01: Admin with only customers.view -> Can open /customers and search/filter customers, but Add Customer, Edit, Deactivate, and Restore buttons are hidden and POST/PUT/DELETE/PATCH API calls return 403 Forbidden.
- TC-PR-02: Admin with customers.view and customers.create only -> Can create new customers (201), but editing (PUT) and soft deleting/restoring (DELETE/PATCH) return 403 Forbidden.
- TC-PR-03: Admin with customers.view and customers.edit only -> Can edit existing customers (200), but creating (POST) and deactivating/restoring return 403 Forbidden.
- TC-PR-04: Admin with customers.view revoked -> Navigating to /customers or calling GET /api/customers returns 403 Forbidden and module disappears from Dashboard.

2. Test Cases: Product Module Action Rights
- TC-PR-05: Admin with only products.view -> Can open /products and search/filter products, but Add Product, Edit, Deactivate, and Restore buttons are hidden and write API calls return 403 Forbidden.
- TC-PR-06: Admin with products.view and products.edit only -> Can edit existing products (200), but creating (POST) and soft deleting/restoring (DELETE/PATCH) return 403 Forbidden.
- TC-PR-07: Admin with products.view revoked -> Navigating to /products or calling GET /api/products returns 403 Forbidden.

3. Test Cases: Price History Action Rights
- TC-PR-08: Admin without prices.view -> Prices button is hidden on /products and GET /api/products/:prodcode/prices returns 403 Forbidden.
- TC-PR-09: Admin with prices.view and prices.create only -> Can view price history and add new price entries (201), but editing (PUT) and deleting (DELETE) price entries return 403 Forbidden.
- TC-PR-10: Standard User (Staff) without module rights -> All customer, product, and price history pages and API endpoints return 403 Forbidden; Superadmin retains full access across all rights.
