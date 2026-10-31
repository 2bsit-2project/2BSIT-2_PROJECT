const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const envConfigPath = path.resolve(__dirname, '../src/config/env.js');

test('environment configuration rejects invalid ports', () => {
  const previousPort = process.env.PORT;
  process.env.PORT = 'not-a-port';
  delete require.cache[envConfigPath];

  try {
    assert.throws(() => require(envConfigPath), {
      message: 'PORT must be an integer between 1 and 65535.'
    });
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
    delete require.cache[envConfigPath];
  }
});

test('environment configuration uses defaults when ports are unset', () => {
  const previousPort = process.env.PORT;
  const previousDbPort = process.env.DB_PORT;
  delete process.env.PORT;
  delete process.env.DB_PORT;
  delete require.cache[envConfigPath];

  try {
    const config = require(envConfigPath);
    assert.equal(config.PORT, 3000);
    assert.equal(config.DB_PORT, 5432);
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
    if (previousDbPort === undefined) {
      delete process.env.DB_PORT;
    } else {
      process.env.DB_PORT = previousDbPort;
    }
    delete require.cache[envConfigPath];
  }
});
