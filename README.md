# InfoMan

This repository contains the initial scaffold for the InfoMan project.

## Overview

This task covers the project bootstrap for the application:

- Express application skeleton
- Environment configuration with `.env`
- PostgreSQL connection setup
- Health check endpoint for validating runtime status

## Getting started

1. Copy `.env.example` to `.env` and update the values for your local environment.
2. Install dependencies:
   npm install
3. Run the application:
   npm start
4. Open the app in the browser at `http://localhost:3000`.

If port 3000 is already in use, the app will automatically retry on the next available port and report the active port in the health response.

## Routes

- `GET /` returns basic app metadata.
- `GET /health` returns application and database status.

## Database connection

The database configuration lives in `src/config/db.js` and reads its values from `src/config/env.js`. The app attempts a `SELECT 1` query at startup and exposes the database state through `/health`.

