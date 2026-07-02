import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import {
  hasDatabaseUrl,
  parseSetCookie,
  requestJson,
  sessionAuthHeaders,
  startTestServer,
  validRegisterBody,
} from '../test/httpHelpers.js';

let server;

before(async () => {
  process.env.NODE_ENV = 'test';
  server = await startTestServer(createApp);
});

after(async () => {
  await server?.close();
});

async function registerUser(label) {
  const body = validRegisterBody({
    email: `${label}-${Date.now()}@example.com`,
    username: `${label}${Date.now()}`,
    name: `${label} User`,
  });
  const { status, body: resBody, headers } = await requestJson(server.baseUrl, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  assert.equal(status, 201);
  const cookie = parseSetCookie(headers.getSetCookie?.() || headers.get('set-cookie'));
  assert.ok(cookie?.value);
  return { token: cookie.value, user: resBody.user };
}

describe('DM block and mute', { skip: !hasDatabaseUrl() }, () => {
  test('block prevents messaging both ways', async () => {
    const alice = await registerUser('blockalice');
    const bob = await registerUser('blockbob');

    const blockRes = await requestJson(server.baseUrl, `/api/messages/block/${bob.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(alice.token),
    });
    assert.equal(blockRes.status, 200);
    assert.equal(blockRes.body.blocked, true);

    const bobSend = await requestJson(server.baseUrl, `/api/messages/with/${alice.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(bob.token),
      body: JSON.stringify({ body: 'hello?' }),
    });
    assert.equal(bobSend.status, 403);

    const aliceSend = await requestJson(server.baseUrl, `/api/messages/with/${bob.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(alice.token),
      body: JSON.stringify({ body: 'sorry' }),
    });
    assert.equal(aliceSend.status, 403);

    const bobView = await requestJson(server.baseUrl, `/api/messages/with/${alice.user.id}`, {
      headers: sessionAuthHeaders(bob.token),
    });
    assert.equal(bobView.status, 403);
  });

  test('unblock restores messaging', async () => {
    const alice = await registerUser('unblockalice');
    const bob = await registerUser('unblockbob');

    await requestJson(server.baseUrl, `/api/messages/block/${bob.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(alice.token),
    });

    const unblockRes = await requestJson(server.baseUrl, `/api/messages/block/${bob.user.id}`, {
      method: 'DELETE',
      headers: sessionAuthHeaders(alice.token),
    });
    assert.equal(unblockRes.status, 200);

    const sendRes = await requestJson(server.baseUrl, `/api/messages/with/${alice.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(bob.token),
      body: JSON.stringify({ body: 'we good?' }),
    });
    assert.equal(sendRes.status, 201);
  });

  test('mute hides thread from inbox', async () => {
    const alice = await registerUser('mutealice');
    const charlie = await registerUser('mutecharlie');

    await requestJson(server.baseUrl, `/api/messages/with/${charlie.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(alice.token),
      body: JSON.stringify({ body: 'ping' }),
    });

    const muteRes = await requestJson(server.baseUrl, `/api/messages/mute/${charlie.user.id}`, {
      method: 'POST',
      headers: sessionAuthHeaders(alice.token),
    });
    assert.equal(muteRes.status, 200);

    const inboxRes = await requestJson(server.baseUrl, '/api/messages/inbox', {
      headers: sessionAuthHeaders(alice.token),
    });
    assert.equal(inboxRes.status, 200);
    const ids = inboxRes.body.map((row) => row.otherUser.id);
    assert.ok(!ids.includes(charlie.user.id));
  });
});
