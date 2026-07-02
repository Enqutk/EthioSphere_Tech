import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hasDatabaseUrl, startTestServer, requestJson, parseSetCookie } from '../test/httpHelpers.js';
import { SESSION_COOKIE_NAME } from '../lib/sessionCookie.js';
import { hashResetToken } from '../lib/passwordReset.js';

let server;

before(async () => {
  process.env.NODE_ENV = 'development';
  server = await startTestServer(createApp);
});

after(async () => {
  await server?.close();
});

describe('GET /api/health', () => {
  test('returns API status and database probe', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/health');
    assert.equal(body.message, 'Programmers World API');

    if (hasDatabaseUrl()) {
      assert.equal(status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.db, 'ok');
    } else {
      assert.equal(status, 503);
      assert.equal(body.ok, false);
      assert.equal(body.db, 'error');
    }
  });
});

describe('POST /api/auth validation', () => {
  test('forgot-password rejects invalid email', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert.equal(status, 400);
    assert.ok(body.errors);
  });

  test('reset-password rejects short password', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'abc', password: '123' }),
    });
    assert.equal(status, 400);
    assert.ok(body.errors);
  });

  test('reset-password rejects invalid token', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token', password: 'secret12' }),
    });
    assert.equal(status, 400);
    assert.equal(body.error, 'Invalid or expired reset link. Request a new one.');
  });
});

describe('POST /api/auth with database', { skip: !hasDatabaseUrl() }, () => {
  const initialPassword = 'testpass123';
  let currentPassword = initialPassword;
  let userId;
  let email;
  let username;

  before(async () => {
    email = `pw-test-${Date.now()}@example.com`;
    username = `pwtest${Date.now()}`;
    const passwordHash = await bcrypt.hash(initialPassword, 4);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'PW Test User',
        username,
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('2000-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    userId = user.id;
  });

  after(async () => {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test('login sets session cookie and returns user', async () => {
    const { status, body, headers } = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: currentPassword }),
    });

    assert.equal(status, 200);
    assert.equal(body.user.email, email);
    const cookie = parseSetCookie(headers.getSetCookie?.() || headers.get('set-cookie'));
    assert.ok(cookie);
    assert.equal(cookie.name, SESSION_COOKIE_NAME);
    assert.ok(cookie.value);
  });

  test('login rejects wrong password', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });
    assert.equal(status, 401);
    assert.equal(body.error, 'Invalid email or password');
  });

  test('forgot-password and reset-password update credentials', async () => {
    const forgot = await requestJson(server.baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.equal(forgot.status, 200);
    assert.match(forgot.body.message, /If an account exists/i);

    const tokenRow = await prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(tokenRow);

    const rawToken = 'integration-test-token';
    await prisma.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { tokenHash: hashResetToken(rawToken) },
    });

    const newPassword = 'newpass456';
    const reset = await requestJson(server.baseUrl, '/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: newPassword }),
    });
    assert.equal(reset.status, 200);

    const oldLogin = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: currentPassword }),
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: newPassword }),
    });
    assert.equal(newLogin.status, 200);
    currentPassword = newPassword;
  });

  test('banned user cannot login', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        banReason: 'Integration test ban',
        banExpiresAt: null,
      },
    });

    const { status, body } = await requestJson(server.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: currentPassword }),
    });
    assert.equal(status, 403);
    assert.equal(body.code, 'ACCOUNT_BANNED');

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        banExpiresAt: null,
      },
    });
  });
});
