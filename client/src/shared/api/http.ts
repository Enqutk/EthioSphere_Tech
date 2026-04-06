/**
 * Low-level JSON API client. All domain modules use /api calls (Vite proxies to the backend).
 */

function buildFetchErrorMessage(
  res: Response,
  raw: string,
  parsed: unknown,
  data: Record<string, unknown>,
): string {
  const validationErrors = data.errors as { msg?: string; path?: string }[] | undefined;
  const err = typeof data.error === 'string' ? data.error : '';
  const message = typeof data.message === 'string' ? data.message : '';
  const hint = typeof data.hint === 'string' ? data.hint.trim() : '';
  const details = data.details != null ? String(data.details) : '';

  let msg =
    err ||
    message ||
    (raw && parsed === undefined ? raw.replace(/<[^>]+>/g, ' ').trim().slice(0, 500) : '') ||
    res.statusText;

  if ((res.status === 502 || res.status === 503 || res.status === 504) && !err && !message) {
    msg =
      'Cannot reach the API. Start the server (cd server && npm run dev) and ensure it runs on the port Vite proxies to (default 4000).';
  }

  if (Array.isArray(validationErrors) && validationErrors.length) {
    msg = validationErrors.map((e) => e.msg || String(e)).join(' ');
  }

  if (
    res.status >= 500 &&
    (!msg.trim() || msg === 'Internal Server Error' || msg === 'Service Unavailable')
  ) {
    msg =
      'Server error (empty, timed out, or non-JSON response). Start the API on port 4000, wake Neon in the dashboard, and add connect_timeout to DATABASE_URL (see server/.env.example).';
  }

  const add: string[] = [];
  if (hint && !msg.includes(hint)) add.push(hint);
  if (details && !msg.includes(details)) add.push(details);
  let out = add.length ? `${msg} (${add.join(' — ')})` : msg;

  const trimmedRaw = raw.trim();
  const weakJson =
    parsed !== undefined &&
    typeof data === 'object' &&
    data !== null &&
    !err &&
    !message &&
    Object.keys(data).length === 0;
  const showBody =
    trimmedRaw &&
    res.status >= 500 &&
    (parsed === undefined || trimmedRaw === '{}' || weakJson || (!err && !message && !hint));
  if (showBody) {
    out += `\n\n--- response body (${res.status}, ${res.headers.get('content-type') || 'no Content-Type'}) ---\n${trimmedRaw.slice(0, 800)}`;
  }

  return out;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const url = `${path.startsWith('/') ? path : `/${path}`}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const raw = await res.text();
  const ct = res.headers.get('content-type') || '';
  let parsed: unknown;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
  }
  const data = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(buildFetchErrorMessage(res, raw, parsed, data));
  }

  if (!raw) return {} as T;
  if (parsed === undefined) {
    throw new Error(`Invalid or non-JSON response from ${path}${ct ? ` (${ct})` : ''}`);
  }
  return parsed as T;
}

export async function apiWithResponse<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<{ data: T; response: Response }> {
  const { token, ...init } = options;
  const url = `${path.startsWith('/') ? path : `/${path}`}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const raw = await res.text();
  const ct = res.headers.get('content-type') || '';
  let parsed: unknown;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
  }
  const data = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(buildFetchErrorMessage(res, raw, parsed, data));
  }

  if (!raw) return { data: {} as T, response: res };
  if (parsed === undefined) {
    throw new Error(`Invalid or non-JSON response from ${path}${ct ? ` (${ct})` : ''}`);
  }
  return { data: parsed as T, response: res };
}
