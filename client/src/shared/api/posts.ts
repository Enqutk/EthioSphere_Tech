import { api } from './http';

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
