import { api, apiWithResponse } from './http';
import { listQueryString, type ListQueryParams, type PaginatedResponse } from './pagination';

export type ProjectListParams = ListQueryParams & {
  status?: string;
  type?: string;
  search?: string;
};

export const projectsApi = {
  list: (params?: ProjectListParams, token?: string | null) => {
    const q = listQueryString(params);
    return api<PaginatedResponse<unknown>>(`/api/projects${q}`, token ? { token } : {});
  },
  get: (id: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/projects/${id}`, token ? { token } : {}),
  /** Project detail; `githubRefreshing` is true when the server is updating GitHub data in the background. */
  getDetail: async (id: string, token?: string | null) => {
    const { data, response } = await apiWithResponse<Record<string, unknown>>(
      `/api/projects/${id}`,
      token ? { token } : {},
    );
    const githubRefreshing = response.headers.get('x-github-refresh') === 'scheduled';
    return { project: data, githubRefreshing };
  },
  create: (
    token: string,
    body: {
      githubRepoUrl: string;
      title?: string;
      description?: string;
      type?: string;
      visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
      seekingReview?: boolean;
      rolesNeeded?: string[];
    },
  ) => api<unknown>('/api/projects', { method: 'POST', body: JSON.stringify(body), token }),
  patch: (token: string, id: string, body: Record<string, unknown>) =>
    api<unknown>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
  join: (token: string, id: string, role: string) =>
    api<unknown>(`/api/projects/${id}/join`, { method: 'POST', body: JSON.stringify({ role }), token }),
  like: (token: string, id: string) =>
    api<{ liked: boolean; likeCount: number; pulseScore: number }>(`/api/projects/${id}/like`, {
      method: 'POST',
      token,
    }),
};
