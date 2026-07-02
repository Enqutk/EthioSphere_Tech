import { api } from './http';
import { listQueryString, type ListQueryParams, type PaginatedResponse } from './pagination';

export type PostVoteResult = {
  upvotes: number;
  downvotes: number;
  pulseScore: number;
  viewerVote: 'up' | 'down';
};

export type PostListParams = ListQueryParams & {
  section?: string;
  search?: string;
};

export const postsApi = {
  list: (params?: PostListParams) => {
    const q = listQueryString(params);
    return api<PaginatedResponse<unknown>>(`/api/posts${q}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/posts/${id}`),
  create: (body: { title: string; body: string; section?: string; repoUrl?: string; projectId?: string }) =>
    api<unknown>('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  addComment: (postId: string, body: { body: string; isSolution?: boolean }) =>
    api<unknown>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  vote: (postId: string, upvote: boolean) =>
    api<PostVoteResult>(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ upvote }),
    }),
};
