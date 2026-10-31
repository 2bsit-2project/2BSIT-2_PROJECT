# 2BSIT-2_PROJECT (InfoMan)

InfoMan is an Express application with user registration and login. New accounts
start with a `pending` status. Passwords are stored as scrypt hashes, and login
uses random, server-side session tokens.

## Features

- `GET /` application metadata
- `GET /health` application and database status
- `GET /register` registration page
- `GET /login` login and logout page
- `GET /forgot-password` request a password reset email
- `GET /reset-password` choose a new password from a reset link
- `GET /admin/users` administrator user-management screen
- `GET /superadmin/users` Superadmin approval and role-management screen
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
- `GET /api/superadmin/users` list non-Superadmin users (Superadmin only)
- `PATCH /api/superadmin/users/:id/approve` approve a pending account
- `PATCH /api/superadmin/users/:id/role` assign or remove administrator role
- `PATCH /api/superadmin/users/:id/block` block or unblock an account
- `GET /api/users` list users
- `PATCH /api/users/:id/status` approve a pending account (Superadmin only)

## Project structure

- `src/server.js` starts the HTTP server.
- `src/app.js` configures Express routes and middleware.
- `src/config/env.js` loads and validates environment settings.
- `src/config/db.js` configures PostgreSQL, initializes tables, and reports database status.
- `src/config/security.js` hashes and verifies passwords.
- `src/config/email.js` sends password reset emails over SMTP.
- `public/` contains the registration and login pages.

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

Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` (at least 8 characters) in
`.env` to provision the separate Superadmin account. Sign in with it and open
`/superadmin/users` to approve pending accounts, promote active users to
administrators, and block or unblock accounts. Pending accounts cannot sign in
until approved. Superadmin accounts are excluded from both management screens
and cannot be changed through their APIs.
