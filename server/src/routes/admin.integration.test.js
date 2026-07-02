import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import {
  hasDatabaseUrl,
  startTestServer,
  requestJson,
  sessionAuthHeaders,
} from '../test/httpHelpers.js';

let server;

before(async () => {
  process.env.NODE_ENV = 'test';
  server = await startTestServer(createApp);
});

after(async () => {
  await server?.close();
});

describe('GET /api/admin', { skip: !hasDatabaseUrl() }, () => {
  let adminId;
  let memberId;
  let adminToken;
  let memberToken;

  before(async () => {
    const ts = Date.now();
    const passwordHash = await bcrypt.hash('adminpass', 4);

    const admin = await prisma.user.create({
      data: {
        email: `admin-${ts}@example.com`,
        username: `admintest${ts}`,
        name: 'Admin Test',
        passwordHash,
        isAdmin: true,
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    adminId = admin.id;
    adminToken = signToken({ userId: adminId });

    const member = await prisma.user.create({
      data: {
        email: `member-${ts}@example.com`,
        username: `membertest${ts}`,
        name: 'Member Test',
        passwordHash,
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    memberId = member.id;
    memberToken = signToken({ userId: memberId });
  });

  after(async () => {
    const ids = [adminId, memberId].filter(Boolean);
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('rejects unauthenticated requests', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/admin/overview');
    assert.equal(status, 401);
    assert.match(body.error, /Authentication required/i);
  });

  test('rejects non-admin users', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/admin/overview', {
      headers: sessionAuthHeaders(memberToken),
    });
    assert.equal(status, 403);
    assert.match(body.error, /Admin access required/i);
  });

  test('returns overview counts for admin', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/admin/overview', {
      headers: sessionAuthHeaders(adminToken),
    });
    assert.equal(status, 200);
    assert.ok(typeof body.users === 'number');
    assert.ok(typeof body.posts === 'number');
    assert.ok(typeof body.challenges === 'number');
    assert.ok(typeof body.projects === 'number');
  });

  test('lists users for admin', async () => {
    const { status, body } = await requestJson(server.baseUrl, '/api/admin/users', {
      headers: sessionAuthHeaders(adminToken),
    });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.some((u) => u.id === adminId));
  });
});
