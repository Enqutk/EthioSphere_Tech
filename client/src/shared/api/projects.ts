import { api } from './http';

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
