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
- `src/config/db.js` configures PostgreSQL, initializes the application tables, and reports database status.
- `public/` contains the registration and login pages.

## Getting started

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