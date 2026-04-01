// Vite proxies /api to the backend; use same origin in browser
const getBaseUrl = () => '';

export type User = {
  id: string;
  email?: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  githubUrl?: string | null;
  skills?: string[];
};

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const extra = [data.hint, data.details].filter(Boolean).join(' — ');
    const msg = data.error || data.message || res.statusText;
    throw new Error(extra ? `${msg} (${extra})` : msg);
  }
  return data as T;
}

export const authApi = {
  register: (body: { email: string; password: string; name: string; username: string }) =>
    api<{ user: User; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};

export const usersApi = {
  me: (token: string) => api<Record<string, unknown>>('/api/users/me', { token }),
  getByUsername: (username: string) => api<Record<string, unknown>>(`/api/users/${username}`),
  updateMe: (token: string, body: Record<string, unknown>) =>
    api<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body), token }),
};

export const projectsApi = {
  list: (params?: { status?: string; type?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/projects${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/projects/${id}`),
  create: (token: string, body: { title: string; description: string; type?: string }) =>
    api<unknown>('/api/projects', { method: 'POST', body: JSON.stringify(body), token }),
  join: (token: string, id: string, role: string) =>
    api<unknown>(`/api/projects/${id}/join`, { method: 'POST', body: JSON.stringify({ role }), token }),
};

export const challengesApi = {
  list: (params?: { difficulty?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/challenges${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/challenges/${id}`),
  submit: (token: string, id: string, body: { solutionUrl?: string }) =>
    api<unknown>(`/api/challenges/${id}/submit`, { method: 'POST', body: JSON.stringify(body), token }),
};

export const postsApi = {
  list: (params?: { section?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/posts${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/posts/${id}`),
  create: (token: string, body: { title: string; body: string; section?: string }) =>
    api<unknown>('/api/posts', { method: 'POST', body: JSON.stringify(body), token }),
  addComment: (token: string, postId: string, body: { body: string; isSolution?: boolean }) =>
    api<unknown>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body), token }),
};
