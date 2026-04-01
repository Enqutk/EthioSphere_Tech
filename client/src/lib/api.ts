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
  /** Set at registration when GitHub is linked */
  githubUrl?: string | null;
  skills?: string[];
  isAdmin?: boolean;
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

export const authApi = {
  register: (body: { email: string; password: string; name: string; username: string; githubUrl?: string }) =>
    api<{ user: User; token: string; githubNote?: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};

export const usersApi = {
  me: (token: string) => api<Record<string, unknown>>('/api/users/me', { token }),
  getByUsername: (username: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/users/${encodeURIComponent(username)}`, token ? { token } : {}),
  updateMe: (token: string, body: Record<string, unknown>) =>
    api<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body), token }),
};

export const projectsApi = {
  list: (params?: { status?: string; type?: string; search?: string }, token?: string | null) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/projects${q ? `?${q}` : ''}`, token ? { token } : {});
  },
  get: (id: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/projects/${id}`, token ? { token } : {}),
  create: (
    token: string,
    body: {
      githubRepoUrl: string;
      title?: string;
      description?: string;
      type?: string;
      visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
      seekingReview?: boolean;
    },
  ) => api<unknown>('/api/projects', { method: 'POST', body: JSON.stringify(body), token }),
  patch: (token: string, id: string, body: Record<string, unknown>) =>
    api<unknown>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
  join: (token: string, id: string, role: string) =>
    api<unknown>(`/api/projects/${id}/join`, { method: 'POST', body: JSON.stringify({ role }), token }),
};

export const messagesApi = {
  inbox: (token: string) =>
    api<
      {
        threadId: string;
        otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
        lastMessage: { body: string; createdAt: string; senderId: string; readAt: string | null } | null;
        updatedAt: string;
      }[]
    >('/api/messages/inbox', { token }),
  thread: (token: string, userId: string) =>
    api<{
      threadId: string;
      otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
      messages: { id: string; body: string; createdAt: string; senderId: string; sender: { id: string; username: string } }[];
    }>(`/api/messages/with/${userId}`, { token }),
  send: (token: string, userId: string, body: string) =>
    api<unknown>(`/api/messages/with/${userId}`, { method: 'POST', body: JSON.stringify({ body }), token }),
};

export const followApi = {
  incoming: (token: string) =>
    api<{ id: string; followerId: string; follower: { id: string; name: string; username: string; avatarUrl?: string | null } }[]>(
      '/api/follow/requests/incoming',
      { token },
    ),
  accept: (token: string, id: string) => api<unknown>(`/api/follow/requests/${id}/accept`, { method: 'POST', token }),
  reject: (token: string, id: string) => api<unknown>(`/api/follow/requests/${id}/reject`, { method: 'POST', token }),
  follow: (token: string, username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'POST', token }),
  unfollow: (token: string, username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'DELETE', token }),
};

export const challengesApi = {
  list: (params?: { difficulty?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/challenges${q ? `?${q}` : ''}`);
  },
  get: (id: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/challenges/${id}`, token ? { token } : {}),
  submit: (token: string, id: string, body: { solutionUrl?: string }) =>
    api<unknown>(`/api/challenges/${id}/submit`, { method: 'POST', body: JSON.stringify(body), token }),
  create: (
    token: string,
    body: {
      title: string;
      description: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      rewardPoints?: number;
      submissionOpensAt?: string;
      submissionClosesAt?: string;
    },
  ) => api<unknown>('/api/challenges', { method: 'POST', body: JSON.stringify(body), token }),
};

export const adminApi = {
  overview: (token: string) =>
    api<{ users: number; posts: number; challenges: number; projects: number }>('/api/admin/overview', { token }),
  posts: (token: string) =>
    api<{ id: string; title: string; section: string; createdAt: string; author: { id: string; username: string; name: string } }[]>(
      '/api/admin/posts',
      { token },
    ),
  deletePost: (token: string, postId: string) =>
    api<unknown>(`/api/admin/posts/${postId}`, { method: 'DELETE', token }),
  users: (token: string) =>
    api<
      {
        id: string;
        email: string;
        username: string;
        name: string;
        isAdmin: boolean;
        createdAt: string;
        _count: { posts: number; projectsOwned: number };
      }[]
    >('/api/admin/users', { token }),
  deleteUser: (token: string, userId: string) =>
    api<unknown>(`/api/admin/users/${userId}`, { method: 'DELETE', token }),
  deleteChallenge: (token: string, challengeId: string) =>
    api<unknown>(`/api/admin/challenges/${challengeId}`, { method: 'DELETE', token }),
};

export const postsApi = {
  list: (params?: { section?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/posts${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/posts/${id}`),
  create: (
    token: string,
    body: { title: string; body: string; section?: string; repoUrl?: string; projectId?: string },
  ) => api<unknown>('/api/posts', { method: 'POST', body: JSON.stringify(body), token }),
  addComment: (token: string, postId: string, body: { body: string; isSolution?: boolean }) =>
    api<unknown>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body), token }),
};
