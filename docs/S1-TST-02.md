Sprint 1 Test Cases: Authentication & Account Setup

Task: S1-TST-02
Project: Hope, Inc. ERP

1. Test Cases: Registration
- TC-REG-01: Submit valid details on Register screen -> Account created with User role by default.
- TC-REG-02: Register with existing email -> Show error message "Email already registered".
- TC-REG-03: Click "Continue with Google" -> Sign in successfully using Google OAuth.

2. Test Cases: Login & Logout
- TC-LOG-01: Login with valid credentials -> Success, redirects to Dashboard based on user role.
- TC-LOG-02: Login with wrong password -> Show error message "Invalid email or password".
- TC-LOG-03: Click Logout button -> Session ends immediately, redirects back to Login/Landing page.

3. Test Cases: Password Management
- TC-PWD-01: Click "Forgot password?" -> Prompt for email and send secure reset link.
- TC-PWD-02: Use valid reset link -> Prompt for new password, save hashed password, and allow login.
- TC-PWD-03: Use expired reset link -> Show error message "Link expired, please request a new one".
