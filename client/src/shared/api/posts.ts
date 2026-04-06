import { api } from './http';

export type PostVoteResult = {
  upvotes: number;
  downvotes: number;
  pulseScore: number;
  viewerVote: 'up' | 'down';
};

export const postsApi = {
  list: (params?: { section?: string; search?: string }, token?: string | null) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/api/posts${q ? `?${q}` : ''}`, token ? { token } : {});
  },
  get: (id: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/posts/${id}`, token ? { token } : {}),
  create: (
    token: string,
    body: { title: string; body: string; section?: string; repoUrl?: string; projectId?: string },
  ) => api<unknown>('/api/posts', { method: 'POST', body: JSON.stringify(body), token }),
  addComment: (token: string, postId: string, body: { body: string; isSolution?: boolean }) =>
    api<unknown>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body), token }),
  vote: (token: string, postId: string, upvote: boolean) =>
    api<PostVoteResult>(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ upvote }),
      token,
    }),
};
