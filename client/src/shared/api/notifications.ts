import { api } from './http';

export type NotificationActor = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
};

export const notificationsApi = {
  list: (params?: { limit?: number; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<AppNotification[]>(`/api/notifications${qs ? `?${qs}` : ''}`);
  },
  unreadCount: () =>
    api<{ count: number; pushConfigured: boolean }>('/api/notifications/unread-count'),
  markRead: (id: string) => api<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => api<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  registerFcmToken: (token: string) =>
    api<{ ok: boolean }>('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  removeFcmToken: (token: string) =>
    api<{ ok: boolean }>('/api/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),
};
