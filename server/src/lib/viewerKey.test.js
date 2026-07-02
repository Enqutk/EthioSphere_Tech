import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewerKeyFromRequest } from './viewerKey.js';

test('viewerKeyFromRequest uses user id when logged in', () => {
  const key = viewerKeyFromRequest({ headers: {}, ip: '1.2.3.4' }, 'user-abc');
  assert.equal(key, 'user:user-abc');
});

test('viewerKeyFromRequest hashes IP for anonymous viewers', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.9' }, ip: '127.0.0.1' };
  const a = viewerKeyFromRequest(req, null);
  const b = viewerKeyFromRequest(req, null);
  assert.match(a, /^anon:[a-f0-9]{24}$/);
  assert.equal(a, b);
});

test('viewerKeyFromRequest differs for different IPs', () => {
  const a = viewerKeyFromRequest({ headers: {}, ip: '1.1.1.1' }, null);
  const b = viewerKeyFromRequest({ headers: {}, ip: '2.2.2.2' }, null);
  assert.notEqual(a, b);
});
