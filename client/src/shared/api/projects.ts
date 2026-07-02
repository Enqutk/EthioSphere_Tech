import { api, apiWithResponse } from './http';
import { listQueryString, type ListQueryParams, type PaginatedResponse } from './pagination';

export type ProjectListParams = ListQueryParams & {
  status?: string;
  type?: string;
  search?: string;
};

export const projectsApi = {
  list: (params?: ProjectListParams) => {
    const q = listQueryString(params);
    return api<PaginatedResponse<unknown>>(`/api/projects${q}`);
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/projects/${id}`),
  getDetail: async (id: string) => {
    const { data, response } = await apiWithResponse<Record<string, unknown>>(`/api/projects/${id}`);
    const githubRefreshing = response.headers.get('x-github-refresh') === 'scheduled';
    return { project: data, githubRefreshing };
  },
  create: (body: {
    githubRepoUrl: string;
    title?: string;
    description?: string;
    type?: string;
    visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
    seekingReview?: boolean;
    rolesNeeded?: string[];
  }) => api<unknown>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  patch: (id: string, body: Record<string, unknown>) =>
    api<unknown>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  join: (id: string, role: string) =>
    api<unknown>(`/api/projects/${id}/join`, { method: 'POST', body: JSON.stringify({ role }) }),
  like: (id: string) =>
    api<{ liked: boolean; likeCount: number; pulseScore: number }>(`/api/projects/${id}/like`, {
      method: 'POST',
    }),
};
