Sprint 2 Test Cases: Bug Reports and Fix Verification

Task: S2-TST-06
Project: Hope, Inc. ERP

1. Test Cases: Sprint 1 Merge Conflict & Professor Notes Fix Verification
- TC-BUG-S2-01: Verify Sprint 1 merge-conflict syntax fixes across package.json, src/app.js, src/config/db.js, src/config/permissions.js, and public HTML pages -> All server and client scripts parse with 0 syntax errors and npm test passes 7/7 suites.
- TC-BUG-S2-02: Verify Main Landing Page fix (GET /) -> Root URL serves public/homepage.html instead of landing on the registration page.
- TC-BUG-S2-03: Verify Simplified Registration Page (/register) -> Duplicate form markup removed; registration uses single Full name, Email address, and Password fields.
- TC-BUG-S2-04: Verify Single Forgot Password Link (/login) -> Duplicate login markup removed; only one "Forgot password?" link is displayed.
- TC-BUG-S2-05: Verify Database Connection & Supabase SSL support (src/config/db.js, src/config/env.js) -> Supports DATABASE_URL and DB_SSL with automatic SSL for Supabase hosts and clean in-memory fallback when offline.
- TC-BUG-S2-06: Verify Set / Reset Password Flow (/forgot-password & /reset-password) -> Generates valid 1-hour single-use reset token (with direct reset link in development when SMTP is unconfigured), updates hashed password, and invalidates old sessions.
- TC-BUG-S2-07: Verify Post-Login Landing Page Redirect (/login -> /dashboard) -> Successful login redirects immediately to /dashboard.

2. Test Cases: Sprint 2 Customer, Product & Price History Defect Verification
- TC-BUG-S2-08: Verify duplicate key and validation handling on Customer and Product creation -> Duplicate custno or prodcode returns 409 Conflict; invalid payterm, unit, or blank required fields return 400 Bad Request.
- TC-BUG-S2-09: Verify duplicate effective date and non-positive price rejection in Price History -> Duplicate (prodcode, effdate) returns 409 Conflict; invalid date or unitprice <= 0 returns 400 Bad Request.
- TC-BUG-S2-10: Verify server-side per-action permission enforcement -> Unauthorized create, edit, soft delete, restore, and price history requests return 403 Forbidden even if invoked directly via API.
