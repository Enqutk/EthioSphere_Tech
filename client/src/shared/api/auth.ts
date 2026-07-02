import { api, getApiBaseUrl, ApiError } from './http';
import type { User } from './types';

export type BanInfo = {
  error: string;
  code: 'ACCOUNT_BANNED';
  banReason: string;
  bannedAt?: string | null;
  banExpiresAt?: string | null;
  isPermanent: boolean;
  canAppeal: boolean;
  appealStatus?: string | null;
};

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    name: string;
    username: string;
    accountType?: 'developer' | 'company';
    githubUrl?: string;
    companyWebsite?: string;
    companyDescription?: string;
    agreedToTerms: boolean;
    primaryDiscipline?: string;
  }) =>
    api<{ user: User; token: string; githubNote?: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: async (body: { email: string; password: string }) => {
    try {
      return await api<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.body.code === 'ACCOUNT_BANNED') {
        const banErr = new ApiError(String(err.body.error || err.message), 403, err.body);
        banErr.name = 'BanError';
        throw banErr;
      }
      throw err;
    }
  },

  submitBanAppeal: (body: { email: string; password: string; message: string; explanation?: string }) =>
    api<{ ok: boolean; message: string }>('/api/auth/ban-appeal', { method: 'POST', body: JSON.stringify(body) }),

  googleStatus: () => api<{ enabled: boolean }>('/api/auth/google/status'),

  googleAuthUrl: (from = '/') => {
    const base = getApiBaseUrl();
    const path = `/api/auth/google?from=${encodeURIComponent(from)}`;
    return base ? `${base}${path}` : path;
  },
};
