# InfoMan

This repository contains the InfoMan project: an Express API with PostgreSQL support and a simple registration form. New users are created with a `pending` status by default so they can be reviewed before approval.

## Overview

- Express application skeleton
- Environment configuration with `.env`
- PostgreSQL connection setup
- Health check endpoint for validating runtime status
- User registration form and API

## Getting started

1. Copy `.env.example` to `.env` and update the values for your local environment.
2. Install dependencies:
   npm install
3. Run the application:
   npm start
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