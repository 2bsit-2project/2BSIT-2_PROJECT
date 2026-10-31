# InfoMan

This project includes an Express API with registration and login forms. New users are created with a `pending` status by default so they can be reviewed before approval. Passwords are stored as scrypt hashes, and login sessions use random, server-side session tokens.

## Features

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

## Project structure

- `src/server.js` starts the HTTP server.
- `src/app.js` configures Express routes and middleware.
- `src/config/env.js` loads and validates environment settings.
- `src/config/db.js` configures PostgreSQL, initializes the application tables, and reports database status.
- `public/` contains the registration and login pages.

## Getting started

1. Copy `.env.example` to `.env` and adjust your PostgreSQL settings.
2. Install dependencies:
   npm install
3. Start the app:
   npm start
4. Open `http://localhost:3000/register` to view the registration page.
5. After registering, open `http://localhost:3000/login` to sign in or out.

The app loads PostgreSQL settings from `.env` using `dotenv` and attempts to initialize its tables when it starts. If the database is unavailable, it logs the failure and uses an in-memory store so the registration flow still works for local testing. In-memory users and sessions are lost when the process stops.
