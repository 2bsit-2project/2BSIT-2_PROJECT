
# 2BSIT-2_PROJECT (InfoMan)


# 2BSIT-2_PROJECT (InfoMan)



# 2BSIT-2_PROJECT (InfoMan)


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
- `GET /api/users` list users
- `PATCH /api/users/:id/status` update user status

# InfoMan

This project includes an Express API with registration and login forms. New users are created with a `pending` status by default so they can be reviewed before approval. Passwords are stored as scrypt hashes, and login sessions use random, server-side session tokens.
This repository contains the InfoMan project: an Express API with PostgreSQL support and a simple registration form. New users are created with a `pending` status by default so they can be reviewed before approval.

## Overview

- `GET /` application metadata
- `GET /health` database and app health status
- `GET /register` registration form page
- `GET /login` login and logout page
- `POST /api/users` register a user
- `POST /api/auth/login` start a session
- `POST /api/auth/logout` end a session
- `GET /api/auth/session` check the current session
- `GET /api/users` list users
- `PATCH /api/users/:id/status` update user status
- Express application skeleton
- Environment configuration with `.env`
- PostgreSQL connection setup
- Health check endpoint for validating runtime status
- User registration form and API


## Project structure

- `src/server.js` starts the HTTP server.
- `src/app.js` configures Express routes and middleware.
- `src/config/env.js` loads and validates environment settings.

- `src/config/db.js` configures PostgreSQL, initializes tables, and reports database status.
- `src/config/security.js` hashes and verifies passwords.
- `src/config/email.js` sends password reset emails over SMTP.

- `src/config/db.js` configures PostgreSQL, initializes the application tables, and reports database status.

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

1. Copy `.env.example` to `.env` and update the values for your local environment.
2. Install dependencies:
   npm install
3. Run the application:
   npm start
4. Open `http://localhost:3000/register` to view the registration page.
5. After registering, open `http://localhost:3000/login` to sign in or out.

The app loads PostgreSQL settings from `.env` using `dotenv` and attempts to initialize its tables when it starts. If the database is unavailable, it logs the failure and uses an in-memory store so the registration flow still works for local testing. In-memory users and sessions are lost when the process stops.
4. Open `http://localhost:3000` in the browser, or `http://localhost:3000/register` for the registration form.

If port 3000 is already in use, the app will automatically retry on the next available port and report the active port in the health response.

## Routes

- `GET /` returns basic app metadata.
- `GET /health` returns application and database status.
- `GET /register` registration form page.
- `POST /api/users` register a user.
- `GET /api/users` list users.
- `PATCH /api/users/:id/status` update user status.

## Database connection

The database configuration lives in `src/config/db.js` and reads its values from `src/config/env.js`. 
The app attempts a `SELECT 1` query at startup and exposes the database state through 
`/health`. If the database is unavailable, user registration falls back to an in-memory store so the flow still works for local testing.



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

- `GET /api/superadmin/users` list non-Superadmin users (Superadmin or assigned admins)
- `PATCH /api/superadmin/users/:id/approve` approve a pending account
- `PATCH /api/superadmin/users/:id/role` assign or remove administrator role
- `PATCH /api/superadmin/users/:id/block` block or unblock an account
- `GET /api/users/:id/permissions` show an administrator's module/action rights
- `PUT /api/users/:id/permissions` assign an administrator's module/action rights
- `GET /api/users` list users
- `PATCH /api/users/:id/status` approve a pending account (Superadmin or assigned admins)

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

- `src/config/permissions.js` defines module/action permissions.
- `src/config/security.js` hashes and verifies passwords.
- `src/config/email.js` sends password reset emails over SMTP.
- `public/` contains the registration, login, management pages, and shared rights dialog.

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


Administrators can open the **Rights** dialog for another administrator from
either management screen. Rights are grouped by module and enforced by the API
for each action. An administrator can only delegate rights they already hold
and cannot change their own rights; Superadmins can assign any listed right.
Administrators promoted by a Superadmin receive the standard user-management
rights by default; administrators promoted by another administrator receive
only the promoting administrator's rights.


InfoMan is an Express application with user registration and login. New accounts
start with a `pending` status. Passwords are stored as scrypt hashes, and login
uses random, server-side session tokens.

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

Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` (at least 8 characters) in
`.env` to provision the separate Superadmin account. Sign in with it and open
`/superadmin/users` to approve pending accounts, promote active users to
administrators, and block or unblock accounts. Pending accounts cannot sign in
until approved. Superadmin accounts are excluded from both management screens
and cannot be changed through their APIs.

Administrators can open the **Rights** dialog for another administrator from
either management screen. Rights are grouped by module and enforced by the API
for each action. An administrator can only delegate rights they already hold
and cannot change their own rights; Superadmins can assign any listed right.
Administrators promoted by a Superadmin receive the standard user-management
rights by default; administrators promoted by another administrator receive
only the promoting administrator's rights.
