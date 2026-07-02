import { api } from './http';

export type ChallengesListPayload = {
  challenges: unknown[];
  canCreateChallenge: boolean;
  createRequirement: string;
};

export type ChallengeCreatedBy = {
  id: string;
  username: string;
  name: string;
  accountType?: 'DEVELOPER' | 'COMPANY';
  company?: { legalName: string; verificationStatus: string } | null;
};

export const challengesApi = {
  list: async (params?: { difficulty?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    const raw = await api<unknown>(`/api/challenges${q ? `?${q}` : ''}`);
    if (Array.isArray(raw)) {
      return {
        challenges: raw,
        canCreateChallenge: false,
        createRequirement: '',
      } as ChallengesListPayload;
    }
    return raw as ChallengesListPayload;
  },
  get: (id: string) => api<Record<string, unknown>>(`/api/challenges/${id}`),
  submit: (id: string, body: { solutionUrl?: string; solutionText?: string; solutionLanguage?: string }) =>
    api<unknown>(`/api/challenges/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  create: (body: {
    title: string;
    description: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    rewardPoints?: number;
    submissionOpensAt?: string;
    submissionClosesAt?: string;
    submissionMode?: 'GITHUB' | 'CODE';
    requiredLanguages?: string[];
  }) => api<unknown>('/api/challenges', { method: 'POST', body: JSON.stringify(body) }),
  likeSubmission: (challengeId: string, submissionId: string) =>
    api<{ liked: boolean; likeCount: number }>(
      `/api/challenges/${challengeId}/submissions/${submissionId}/like`,
      { method: 'POST' },
    ),
  listSubmissionComments: (challengeId: string, submissionId: string) =>
    api<
      {
        id: string;
        body: string;
        createdAt: string;
        user: { id: string; username: string; name: string; avatarUrl?: string | null };
      }[]
    >(`/api/challenges/${challengeId}/submissions/${submissionId}/comments`),
  addSubmissionComment: (challengeId: string, submissionId: string, body: string) =>
    api<unknown>(`/api/challenges/${challengeId}/submissions/${submissionId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};
