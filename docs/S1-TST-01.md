Sprint 1 Test Plan

Task: S1-TST-01
Project: Hope, Inc. ERP

1. What we are testing:
- Database setup (tables, keys, status, and stamp columns).
- Login, registration, and user roles (Superadmin, Admin, User).
- Customer Management module (Add, Search, Edit, Delete, Restore).

2. Simple Test Cases:
- TC-01: Delete a customer -> Should mark it inactive (soft delete) instead of erasing it, keeping history safe.
- TC-02: Perform an action -> Check if the stamp column logs who did it and when.
- TC-03: Register new user -> Account should start as a regular User, not an Admin.
- TC-04: Login by role -> Check if Admins see deleted rows/audit columns while regular Users only see active rows.
- TC-05: Add customer -> Fill out form, save, and ensure it appears properly in the list.
- TC-06: Search customer -> Type in search bar and check if the list filters instantly.

3. Definition of Done:
- Database tables and keys are working.
- Status and audit stamps are functioning.
- Customer CRUD works smoothly for all roles.
