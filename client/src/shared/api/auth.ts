import { api } from './http';
import type { User } from './types';

export const authApi = {
  register: (body: { email: string; password: string; name: string; username: string; githubUrl?: string }) =>
    api<{ user: User; token: string; githubNote?: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};
