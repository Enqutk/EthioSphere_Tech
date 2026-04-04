import { api } from './http';

export const adminApi = {
  overview: (token: string) =>
    api<{ users: number; posts: number; challenges: number; projects: number }>('/api/admin/overview', { token }),
  posts: (token: string) =>
    api<{ id: string; title: string; section: string; createdAt: string; author: { id: string; username: string; name: string } }[]>(
      '/api/admin/posts',
      { token },
    ),
  deletePost: (token: string, postId: string) =>
    api<unknown>(`/api/admin/posts/${postId}`, { method: 'DELETE', token }),
  users: (token: string) =>
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
    >('/api/admin/users', { token }),
  deleteUser: (token: string, userId: string) =>
    api<unknown>(`/api/admin/users/${userId}`, { method: 'DELETE', token }),
  deleteChallenge: (token: string, challengeId: string) =>
    api<unknown>(`/api/admin/challenges/${challengeId}`, { method: 'DELETE', token }),
};
