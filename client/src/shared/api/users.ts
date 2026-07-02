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
  me: () => api<Record<string, unknown>>('/api/users/me'),
  discover: (params?: { q?: string; skill?: string; discipline?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.q?.trim()) q.set('q', params.q.trim());
    if (params?.skill?.trim()) q.set('skill', params.skill.trim());
    if (params?.discipline?.trim()) q.set('discipline', params.discipline.trim());
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api<DiscoverUser[]>(`/api/users/discover${qs ? `?${qs}` : ''}`);
  },
  getByUsername: (username: string) =>
    api<Record<string, unknown>>(`/api/users/${encodeURIComponent(username)}`),
  updateMe: (body: Record<string, unknown>) =>
    api<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  updateSettings: (body: { notificationPrefs: NotificationPrefs }) =>
    api<{ notificationPrefs: NotificationPrefs }>('/api/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword?: string; newPassword: string }) =>
    api<{ ok: boolean; message: string }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
