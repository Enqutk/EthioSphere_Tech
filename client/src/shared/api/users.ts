import { api } from './http';
import type { DiscoverUser, User } from './types';

export type NotificationPrefs = {
  emailOnMessage: boolean;
  emailOnFollow: boolean;
  emailOnChallenge: boolean;
  emailOnProjectInvite: boolean;
  emailOnCommunityReply: boolean;
};

export const usersApi = {
  me: (token: string) => api<Record<string, unknown>>('/api/users/me', { token }),
  discover: (params?: { q?: string; skill?: string; discipline?: string; limit?: number }, token?: string | null) => {
    const q = new URLSearchParams();
    if (params?.q?.trim()) q.set('q', params.q.trim());
    if (params?.skill?.trim()) q.set('skill', params.skill.trim());
    if (params?.discipline?.trim()) q.set('discipline', params.discipline.trim());
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api<DiscoverUser[]>(`/api/users/discover${qs ? `?${qs}` : ''}`, token ? { token } : {});
  },
  getByUsername: (username: string, token?: string | null) =>
    api<Record<string, unknown>>(`/api/users/${encodeURIComponent(username)}`, token ? { token } : {}),
  updateMe: (token: string, body: Record<string, unknown>) =>
    api<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body), token }),

  updateSettings: (token: string, body: { notificationPrefs: NotificationPrefs }) =>
    api<{ notificationPrefs: NotificationPrefs }>('/api/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
      token,
    }),

  changePassword: (
    token: string,
    body: { currentPassword?: string; newPassword: string },
  ) =>
    api<{ ok: boolean; message: string }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(body),
      token,
    }),
};
