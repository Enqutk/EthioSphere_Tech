import { api } from './http';
import type { FollowForViewer } from './types';

export const followApi = {
  state: (username: string) =>
    api<{ userId: string; self?: boolean; followForViewer: FollowForViewer | null }>(
      `/api/follow/state/${encodeURIComponent(username)}`,
    ),
  incoming: () =>
    api<{ id: string; followerId: string; follower: { id: string; name: string; username: string; avatarUrl?: string | null } }[]>(
      '/api/follow/requests/incoming',
    ),
  accept: (id: string) => api<unknown>(`/api/follow/requests/${id}/accept`, { method: 'POST' }),
  reject: (id: string) => api<unknown>(`/api/follow/requests/${id}/reject`, { method: 'POST' }),
  follow: (username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'POST' }),
  unfollow: (username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'DELETE' }),
};
