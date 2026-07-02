import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig, getJwtSecret } from './index.js';

const envKeys = ['NODE_ENV', 'JWT_SECRET', 'CLIENT_ORIGIN', 'GITHUB_TOKEN'];
const envSnapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    if (envSnapshot[key] === undefined) delete process.env[key];
    else process.env[key] = envSnapshot[key];
  }
});

test('validateProductionConfig passes in development without JWT_SECRET', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.JWT_SECRET;
  assert.doesNotThrow(() => validateProductionConfig());
});

test('validateProductionConfig requires JWT_SECRET in production', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  process.env.CLIENT_ORIGIN = 'https://example.com';
  process.env.GITHUB_TOKEN = 'ghp_test';
  assert.throws(() => validateProductionConfig(), /JWT_SECRET/);
});

test('getJwtSecret uses dev fallback outside production', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.JWT_SECRET;
  assert.equal(getJwtSecret(), 'dev-secret-change-in-production');
});
