import http from 'node:http';

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
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
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
  if (!setCookieHeader) return null;
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  const match = first.match(/^([^=]+)=([^;]+)/);
  if (!match) return null;
  return { name: match[1], value: match[2] };
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
