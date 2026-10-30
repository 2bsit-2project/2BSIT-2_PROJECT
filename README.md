# InfoMan

This project includes an Express API and a simple registration form for creating users. New users are created with a `pending` status by default so they can be reviewed before approval.

## Features

- `GET /` application metadata
- `GET /health` database and app health status
- `GET /register` registration form page
- `POST /api/users` register a user
- `GET /api/users` list users
- `PATCH /api/users/:id/status` update user status

## Getting started

1. Copy `.env.example` to `.env` and adjust your PostgreSQL settings.
2. Install dependencies:
   npm install
3. Start the app:
   npm start
4. Open `http://localhost:3000/register` to view the registration page.

The app attempts to connect to PostgreSQL using the values in `src/config/env.js`. If the database is unavailable, it automatically falls back to an in-memory store so the registration flow still works for local testing.

