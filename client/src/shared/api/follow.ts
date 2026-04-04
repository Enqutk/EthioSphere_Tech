import { api } from './http';
import type { FollowForViewer } from './types';

export const followApi = {
  state: (token: string, username: string) =>
    api<{ userId: string; self?: boolean; followForViewer: FollowForViewer | null }>(
      `/api/follow/state/${encodeURIComponent(username)}`,
      { token },
    ),
  incoming: (token: string) =>
    api<{ id: string; followerId: string; follower: { id: string; name: string; username: string; avatarUrl?: string | null } }[]>(
      '/api/follow/requests/incoming',
      { token },
    ),
  accept: (token: string, id: string) => api<unknown>(`/api/follow/requests/${id}/accept`, { method: 'POST', token }),
  reject: (token: string, id: string) => api<unknown>(`/api/follow/requests/${id}/reject`, { method: 'POST', token }),
  follow: (token: string, username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'POST', token }),
  unfollow: (token: string, username: string) =>
    api<unknown>(`/api/follow/user/${encodeURIComponent(username)}`, { method: 'DELETE', token }),
};
