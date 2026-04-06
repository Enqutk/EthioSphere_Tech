import { api } from './http';

export type ChallengesListPayload = {
  challenges: unknown[];
  canCreateChallenge: boolean;
  createRequirement: string;
};

export const challengesApi = {
  list: async (params?: { difficulty?: string }, token?: string | null) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    const raw = await api<unknown>(`/api/challenges${q ? `?${q}` : ''}`, token ? { token } : {});
    if (Array.isArray(raw)) {
      return {
        challenges: raw,
        canCreateChallenge: false,
        createRequirement: '',
      } as ChallengesListPayload;
    }
    return raw as ChallengesListPayload;
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
