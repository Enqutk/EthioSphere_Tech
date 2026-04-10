/**
 * Low-level JSON API client. All domain modules use /api calls (Vite proxies to the backend).
 */

type ApiOptions = RequestInit & {
  token?: string;
  /** Milliseconds to cache successful GET responses in-memory. 0 disables cache for this call. */
  cacheMs?: number;
};

const DEFAULT_GET_CACHE_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightGets = new Map<string, Promise<unknown>>();
const API_BASE =
  ((import.meta.env?.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env?.VITE_API_URL as string | undefined) ||
    '')
  .trim()
  .replace(/\/+$/, '');

function toApiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

function cacheKey(path: string, token?: string) {
  return `${path}::${token || ''}`;
}

function readGetCache<T>(path: string, token?: string): T | null {
  const hit = getCache.get(cacheKey(path, token));
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    getCache.delete(cacheKey(path, token));
    return null;
  }
  return hit.data as T;
}

function writeGetCache(path: string, token: string | undefined, data: unknown, cacheMs: number) {
  if (cacheMs <= 0) return;
  getCache.set(cacheKey(path, token), { expiresAt: Date.now() + cacheMs, data });
}

function clearGetCache() {
  getCache.clear();
}

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
  options: ApiOptions = {},
): Promise<T> {
  const { token, cacheMs = DEFAULT_GET_CACHE_MS, ...init } = options;
  const url = toApiUrl(path);
  const method = (init.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  if (!isGet) {
    // Any write may change many list/detail endpoints; keep UI consistent.
    clearGetCache();
  }

  if (isGet && cacheMs > 0) {
    const cached = readGetCache<T>(url, token);
    if (cached != null) return cached;
    const inflight = inFlightGets.get(cacheKey(url, token));
    if (inflight) return (await inflight) as T;
  }

  const exec = (async () => {
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
    const out = parsed as T;
    if (isGet && cacheMs > 0) writeGetCache(url, token, out, cacheMs);
    return out;
  })();

  if (isGet && cacheMs > 0) {
    const key = cacheKey(url, token);
    inFlightGets.set(key, exec as Promise<unknown>);
    try {
      return await exec;
    } finally {
      inFlightGets.delete(key);
    }
  }
  return await exec;
}

export async function apiWithResponse<T>(
  path: string,
  options: ApiOptions = {},
): Promise<{ data: T; response: Response }> {
  const { token, ...init } = options;
  const url = toApiUrl(path);
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
