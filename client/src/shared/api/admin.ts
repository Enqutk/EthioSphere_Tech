import { api } from './http';

export const adminApi = {
  overview: () =>
    api<{ users: number; posts: number; challenges: number; projects: number }>('/api/admin/overview'),
  posts: () =>
    api<{ id: string; title: string; section: string; createdAt: string; author: { id: string; username: string; name: string } }[]>(
      '/api/admin/posts',
    ),
  deletePost: (postId: string) =>
    api<unknown>(`/api/admin/posts/${postId}`, { method: 'DELETE' }),
  users: () =>
    api<
      {
        id: string;
        email: string;
        username: string;
        name: string;
        isAdmin: boolean;
        createdAt: string;
        _count: { posts: number; projectsOwned: number };
      }[]
    >('/api/admin/users'),
  deleteUser: (userId: string) =>
    api<unknown>(`/api/admin/users/${userId}`, { method: 'DELETE' }),
  setUserBan: (userId: string, body: { banned: boolean; reason?: string; banDays?: number }) =>
    api<{
      id: string;
      username: string;
      accountType: string;
      isBanned: boolean;
      banReason?: string | null;
      banExpiresAt?: string | null;
    }>(`/api/admin/users/${userId}/ban`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteChallenge: (challengeId: string) =>
    api<unknown>(`/api/admin/challenges/${challengeId}`, { method: 'DELETE' }),
  pendingCompanies: () =>
    api<
      {
        id: string;
        legalName: string;
        website: string;
        description?: string | null;
        createdAt: string;
        user: { id: string; username: string; name: string; email: string };
        _count: { reports: number; reviews: number };
      }[]
    >('/api/admin/companies/pending'),
  verifyCompany: (companyId: string, body: { status: 'VERIFIED' | 'REJECTED' | 'PENDING'; note?: string }) =>
    api(`/api/admin/companies/${companyId}/verification`, { method: 'PATCH', body: JSON.stringify(body) }),
  reports: () =>
    api<
      {
        id: string;
        reason: string;
        details?: string | null;
        status: string;
        createdAt: string;
        reporter: { username: string; name: string };
        targetUser?: { id: string; username: string; name: string; accountType: string } | null;
        company?: { legalName: string; user: { id: string; username: string } } | null;
      }[]
    >('/api/admin/reports'),
  updateReport: (reportId: string, status: 'DISMISSED' | 'ACTIONED' | 'OPEN') =>
    api(`/api/admin/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  banAppeals: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') =>
    api<
      {
        id: string;
        message: string;
        explanation?: string | null;
        status: string;
        adminNote?: string | null;
        createdAt: string;
        reviewedAt?: string | null;
        user: {
          id: string;
          username: string;
          name: string;
          email: string;
          banReason?: string | null;
          bannedAt?: string | null;
          banExpiresAt?: string | null;
        };
      }[]
    >(`/api/admin/ban-appeals${status ? `?status=${status}` : ''}`),
  reviewBanAppeal: (
    appealId: string,
    body: { status: 'APPROVED' | 'REJECTED'; adminNote?: string; unban?: boolean },
  ) =>
    api(`/api/admin/ban-appeals/${appealId}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
