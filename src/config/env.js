const dotenv = require('dotenv');

dotenv.config();

function readPort(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return Number(value);
}

module.exports = {
  PORT: readPort('PORT', 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: readPort('DB_PORT', 5432),
  DB_NAME: process.env.DB_NAME || 'infoman',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres'
};
