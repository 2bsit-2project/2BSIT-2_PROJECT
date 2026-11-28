Sprint 2 Test Cases: Regression Test of Sprint 1

Task: S2-TST-05
Project: Hope, Inc. ERP

1. Test Cases: Landing Page & Authentication Regression
- TC-REG-S1-01: Open root URL (/) -> Loads Hope, Inc. ERP homepage (homepage.html), not the register page.
- TC-REG-S1-02: Open /register and submit Full name, Email, and Password -> Account is created with User role and pending status; duplicate email is rejected cleanly.
- TC-REG-S1-03: Attempt login while account is pending -> System blocks login with 403 until approved by Superadmin or authorized Admin.
- TC-REG-S1-04: Login with valid approved credentials on /login -> Authenticates session cookie and redirects immediately to /dashboard.
- TC-REG-S1-05: Click single "Forgot password?" link on /login, request reset, and set a new password on /reset-password -> Password updates (scrypt hashed), old sessions invalidate, and reset token cannot be reused.
- TC-REG-S1-06: Click Logout -> Session ends immediately and protected routes redirect back to /login.

2. Test Cases: User Management, Roles & Rights Regression
- TC-REG-S1-07: Superadmin approves pending account on /superadmin/users -> Account status changes to active and user can log in.
- TC-REG-S1-08: Superadmin promotes active User to Admin and assigns/revokes action rights via Rights dialog -> Permission changes take effect immediately on both UI navigation and server-side APIs.
- TC-REG-S1-09: Admin creates, edits, blocks, and unblocks standard Users on /admin/users -> Changes persist; blocked users cannot log in and Admin cannot modify Superadmin accounts.

3. Test Cases: Automated Regression Suite Verification
- TC-REG-S1-10: Run npm test across auth, env, user-management, customers, and products suites -> All 7 automated test suites pass with 0 failures after Sprint 2 changes.
