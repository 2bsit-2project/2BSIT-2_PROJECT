Sprint 1 Test Cases: Permission Matrix Tests

Task: S1-TST-04
Project: Hope, Inc. ERP

1. Test Cases: Role-Based Permission Matrix
- TC-PM-01: Superadmin access -> Verify that the Superadmin can access all modules, view deleted rows with status and stamp columns, and manage system settings.
- TC-PM-02: Admin access -> Verify that the Admin can manage most modules and user rights, but cannot view or modify Superadmin accounts.
- TC-PM-03: User (Staff) access -> Verify that a standard User can only view active rows and modules explicitly granted via their rights configuration, with audit columns hidden.
- TC-PM-04: Button and Action enforcement -> Verify that even if interface elements or buttons are visible, server-side authorization blocks unauthorized actions (e.g., attempting to delete records or access restricted reports without permission).
