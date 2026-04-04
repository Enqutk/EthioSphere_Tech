import { api } from './http';

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
