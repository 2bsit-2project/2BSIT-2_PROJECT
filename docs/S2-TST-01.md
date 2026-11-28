Sprint 2 Test Cases: Customer Module

Task: S2-TST-01
Project: Hope, Inc. ERP

1. Test Cases: Customer List, Search & Filter
- TC-CUST-01: Open /customers as Superadmin or authorized Admin -> Displays active HopeDB customers (C0001-C0029) with Customer No., Customer Name, Address, Payment Term, and Status.
- TC-CUST-02: Search by customer name or customer number (e.g., "Globus" or "C0003") -> List filters to matching customer records immediately.
- TC-CUST-03: Filter by Payment Term (COD, 30D, 45D) -> Displays only customers matching the selected payment term.
- TC-CUST-04: Combine search text and Payment Term filter (e.g., "San Diego" + "45D") -> Displays only records matching both criteria.
- TC-CUST-05: Filter by Status (Active, Inactive, All) -> Displays only records matching the selected status; clicking Reset restores default Active view.

2. Test Cases: Create Customer
- TC-CUST-06: Click "Add Customer", fill Customer Name, Address, and Payment Term (leaving Customer No. blank), and submit -> Auto-assigns next customer number (e.g., C0030) and adds customer to list.
- TC-CUST-07: Create a customer with a duplicate Customer No. (e.g., C0001) -> System rejects the request with a duplicate customer error.
- TC-CUST-08: Submit create form with blank required fields or invalid payment term -> System blocks submission and shows validation error.

3. Test Cases: Edit Customer
- TC-CUST-09: Click "Edit" on an existing customer, update name, address, or payment term, and save -> Updated customer details persist and appear in the table; Customer No. remains read-only.

4. Test Cases: Soft Delete & Restore
- TC-CUST-10: Click "Deactivate" on an active customer and confirm -> Customer status changes to Inactive and is hidden from the default Active list without being physically deleted.
- TC-CUST-11: Switch Status filter to Inactive and click "Restore" -> Customer status returns to Active and reappears in the Active list.

5. Test Cases: Permission Enforcement
- TC-CUST-12: Access /customers or /api/customers as an unauthenticated user or standard User without customers.view -> Unauthenticated users redirect to /login (API returns 401); unauthorized users receive 403 Forbidden.
