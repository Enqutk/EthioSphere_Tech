/**
 * Low-level JSON API client. All domain modules use this for /api calls (Vite proxies to the backend).
 */
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
    const validationErrors = data.errors as { msg?: string; path?: string }[] | undefined;
    let msg =
      (data.error as string) ||
      (data.message as string) ||
      (raw && parsed === undefined ? raw.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) : '') ||
      res.statusText;
    if ((res.status === 502 || res.status === 504) && !(data.error || data.message)) {
      msg =
        'Cannot reach the API. Start the server (cd server && npm run dev) and ensure it runs on the port Vite proxies to (default 4000).';
    }
    if (Array.isArray(validationErrors) && validationErrors.length) {
      msg = validationErrors.map((e) => e.msg || String(e)).join(' ');
    }
    const extra = [data.hint, data.details].filter(Boolean).join(' — ');
    throw new Error(extra ? `${msg} (${extra})` : msg);
  }

  if (!raw) return {} as T;
  if (parsed === undefined) {
    throw new Error(`Invalid or non-JSON response from ${path}${ct ? ` (${ct})` : ''}`);
  }
  return parsed as T;
}
