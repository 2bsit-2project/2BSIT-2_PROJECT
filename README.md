# 2BSIT-2_PROJECT (InfoMan)

InfoMan is an Express application with user registration and login. Self-registered
accounts are active immediately; accounts added by an administrator can still
require approval. Passwords are stored as scrypt hashes, and login uses random,
server-side session tokens.

## Features

- `GET /` public product homepage
- `GET /dashboard` signed-in dashboard with role- and rights-filtered module tiles
- `GET /api` application metadata
- `GET /api/dashboard/modules` list modules available to the signed-in user
- `GET /health` application and database status
- `GET /register` registration page
- `GET /login` login and logout page
- `GET /forgot-password` request a password reset email
- `GET /reset-password` choose a new password from a reset link
- `GET /admin/users` administrator user-management screen (admin with `users.view`)
- `GET /superadmin/users` account, role, and rights management screen (Superadmin or assigned admin)
- `POST /api/users` register an account
- `POST /api/auth/login` start a session
- `POST /api/auth/logout` end a session
- `GET /api/auth/session` check the current session
- `POST /api/auth/password-reset/request` email a reset link
- `POST /api/auth/password-reset/confirm` set a new password
- `GET /api/admin/users` list users (admin only)
- `POST /api/admin/users` add a user (admin only)
- `PATCH /api/admin/users/:id` edit user details (admin only)
- `PATCH /api/admin/users/:id/block` block or unblock a user (admin only)
- `GET /api/superadmin/users` list non-Superadmin users (Superadmin or assigned admins)
- `PATCH /api/superadmin/users/:id/approve` approve a pending account
- `PATCH /api/superadmin/users/:id/role` assign or remove administrator role
- `PATCH /api/superadmin/users/:id/block` block or unblock an account
- `GET /api/users/:id/permissions` show an administrator's module/action rights
- `PUT /api/users/:id/permissions` assign an administrator's module/action rights
- `GET /api/users` list users
- `PATCH /api/users/:id/status` approve a pending account (Superadmin or assigned admins)

## Project structure

- `src/server.js` starts the HTTP server.
- `src/app.js` configures Express routes and middleware.
- `src/config/env.js` loads and validates environment settings.
- `src/config/db.js` configures PostgreSQL, initializes tables, and reports database status.
- `src/config/permissions.js` defines module/action permissions.
- `src/config/security.js` hashes and verifies passwords.
- `src/config/email.js` sends password reset emails over SMTP.
- `public/` contains the registration, login, management pages, and shared rights dialog.

## Getting started

1. Copy `.env.example` to `.env` and set your PostgreSQL values.
2. Install dependencies with `npm install`.
3. Start the server with `npm start`.
4. Open `http://localhost:3000/register` to create an account.
5. Open `http://localhost:3000/login` to sign in or out.

The app loads PostgreSQL settings from `.env` using `dotenv` and initializes its
tables on startup. If PostgreSQL is unavailable, the app logs the failure and
uses in-memory storage for local testing. In-memory users and sessions are lost
when the process stops.

## Deploying to Netlify

The included `netlify.toml` runs the Express app as a Netlify Function and routes
site requests through it. Import this repository into Netlify and deploy the
branch you want to publish. Netlify will install dependencies and use the
configured function and redirects automatically.

Add the database settings (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD`) as Netlify environment variables, along with `NODE_ENV=production`.
Use a hosted PostgreSQL database for persistent accounts and sessions; the
in-memory fallback is temporary and will not persist between function calls.
Set `APP_BASE_URL` to the deployed site URL if password-reset emails are enabled.
Keep credentials in Netlify's environment settings, not in GitHub.

After signing in, the main page shows only modules allowed by the account's role
and assigned permissions. The dashboard API filters those modules, and the
server also checks permissions before returning management pages or accepting
module actions. Use `/login` to sign in and `/` to open the dashboard.

To enable password reset emails, set `APP_BASE_URL` to the URL users can reach
and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM`. If your
SMTP server requires authentication, also set `SMTP_USER` and `SMTP_PASSWORD`.
Reset tokens expire after one hour, are stored hashed, and can only be used once.

To enable user management, set `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least
8 characters in `.env`. On startup, the app provisions that account as an
administrator (or grants the admin role to the configured existing email).
Sign in with that account and open `/admin/users`. Administrators can manage
regular accounts, while Superadmin accounts are hidden and cannot be edited or
blocked through the management API. Never commit `.env` or share the
administrator password.

For a ready-to-use regular account, set `DEFAULT_USER_EMAIL` and
`DEFAULT_USER_PASSWORD` (at least 8 characters) in `.env`. On startup, the app
creates this account as an active User if it does not already exist. These seed
credentials should be unique and kept private; do not use demo credentials in
production.

Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` (at least 8 characters) in
`.env` to provision the separate Superadmin account. Sign in with it and open
`/superadmin/users` to review pending accounts created by an administrator,
promote active users to administrators, and block or unblock accounts. New
self-registered accounts are active immediately. An administrator-created
pending account is activated automatically after its first successful sign-in,
or an administrator can approve it in advance. Superadmin accounts are excluded
from both management screens and cannot be changed through their APIs.

Administrators can open the **Rights** dialog for another administrator from
either management screen. Rights are grouped by module and enforced by the API
for each action. An administrator can only delegate rights they already hold
and cannot change their own rights; Superadmins can assign any listed right.
Administrators promoted by a Superadmin receive the standard user-management
rights by default; administrators promoted by another administrator receive
only the promoting administrator's rights.
