Sprint 2 Test Cases: Product and Price History

Task: S2-TST-02
Project: Hope, Inc. ERP

1. Test Cases: Product List, Search & Filter
- TC-PROD-01: Open /products as Superadmin or authorized Admin -> Displays active HopeDB products (AD0001-PS0003) with Product Code, Description, Unit, Current Price, and Status.
- TC-PROD-02: Search by description or product code (e.g., "Toshiba" or "NB0005") -> List filters immediately to matching products.
- TC-PROD-03: Filter by Unit (ea, pc, mtr, pkg, ltr) -> Displays only products matching the selected unit; invalid unit returns 400.
- TC-PROD-04: Combine search text and unit filter (e.g., "Dell" + "ea") -> Displays only products matching both filters.

2. Test Cases: Create & Edit Product
- TC-PROD-05: Click "Add Product", fill Description and Unit (leaving Product Code blank), and save -> Auto-assigns next code (e.g., PD0001) and displays the new product in the table.
- TC-PROD-06: Create a product with an existing Product Code -> System rejects with 409 duplicate product error.
- TC-PROD-07: Submit blank description or invalid unit -> System blocks submission and shows validation error.
- TC-PROD-08: Click "Edit" on an existing product, update description or unit, and save -> Updated details persist while Product Code stays read-only.

3. Test Cases: Price History (Add, Edit, Delete) & Current Price
- TC-PRC-01: Click "Prices" on a product (e.g., PC0001) -> Opens Price History panel showing all historical entries ordered by effective date descending.
- TC-PRC-02: Add a new price with valid effective date (YYYY-MM-DD) and unit price > 0 -> Entry is saved and appears in the Price History table; Current Price updates automatically.
- TC-PRC-03: Add a price entry with a duplicate effective date for the same product -> System rejects with 409 duplicate entry error.
- TC-PRC-04: Add a price with invalid date or unit price <= 0 -> System blocks submission with validation error.
- TC-PRC-05: Edit an existing price entry's effective date or unit price -> Updated entry persists and Current Price recalculates immediately.
- TC-PRC-06: Delete a price entry and confirm -> Entry is removed from price history and Current Price updates to the next latest effective price.
- TC-PRC-07: Query current price as of a past date (e.g., PC0001 as of 2010-06-01) -> Returns the latest price effective on or before that date (499.99 from 2010-05-15), ignoring later dates.
