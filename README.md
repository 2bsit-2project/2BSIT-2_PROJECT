# 2BSIT-2_PROJECT (InfoMan)

InfoMan is an Express application with user registration and login. New accounts
start with a `pending` status. Passwords are stored as scrypt hashes, and login
uses random, server-side session tokens.

## Features

- `GET /` application metadata
- `GET /health` application and database status
- `GET /register` registration page
- `GET /login` login and logout page
- `POST /api/users` register an account
- `POST /api/auth/login` start a session
- `POST /api/auth/logout` end a session
- `GET /api/auth/session` check the current session
- `GET /api/users` list users
- `PATCH /api/users/:id/status` update user status

## Project structure

- `src/server.js` starts the HTTP server.
- `src/app.js` configures Express routes and middleware.
- `src/config/env.js` loads and validates environment settings.
- `src/config/db.js` configures PostgreSQL, initializes tables, and reports database status.
- `src/config/security.js` hashes and verifies passwords.
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
