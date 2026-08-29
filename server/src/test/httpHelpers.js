import http from 'node:http';
import { prisma } from '../lib/prisma.js';
import { createEmailVerificationToken } from '../lib/emailVerification.js';

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function startTestServer(createApp) {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export async function requestJson(baseUrl, path, options = {}) {
  const { headers: optionHeaders, ...rest } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(optionHeaders || {}),
    },
  });

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: res.status, body, headers: res.headers };
}

export function parseSetCookie(setCookieHeader) {
  if (setCookieHeader == null || setCookieHeader === '') return null;
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!first || typeof first !== 'string') return null;
  const match = first.match(/^([^=]+)=([^;]+)/);
  if (!match) return null;
  return { name: match[1], value: match[2] };
}

/** Fetch Headers: empty getSetCookie() is [] (truthy) and must not hide set-cookie. */
export function setCookieFromHeaders(headers) {
  const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : null;
  if (Array.isArray(list) && list.length > 0) return list;
  return headers.get('set-cookie');
}

export function sessionAuthHeaders(token) {
  return { Cookie: `pw_session=${token}` };
}

export function validRegisterBody(overrides = {}) {
  const ts = Date.now();
  return {
    email: `reg-${ts}@example.com`,
    password: 'testpass123',
    name: 'Register Test',
    username: `regtest${ts}`,
    agreedToTerms: true,
    dateOfBirth: '2000-01-01',
    gender: 'PREFER_NOT_TO_SAY',
    ...overrides,
  };
}

/** Register, verify email, return session cookie + public user (matches production signup). */
export async function registerAndGetSession(baseUrl, overrides = {}) {
  const payload = validRegisterBody(overrides);
  const registered = await requestJson(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (registered.status !== 201) {
    throw new Error(`register failed ${registered.status}: ${JSON.stringify(registered.body)}`);
  }
  const row = await prisma.user.findUnique({ where: { email: payload.email } });
  const raw = await createEmailVerificationToken(row.id);
  const verified = await requestJson(baseUrl, '/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: raw }),
  });
  const cookie = parseSetCookie(setCookieFromHeaders(verified.headers));
  return {
    payload,
    token: cookie?.value,
    user: verified.body.user,
    status: verified.status,
  };
}
