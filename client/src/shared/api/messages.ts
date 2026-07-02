import { api } from './http';

export type DmBlockStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
  muted: boolean;
  canSend: boolean;
};

export const messagesApi = {
  inbox: () =>
    api<
      {
        threadId: string;
        otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
        lastMessage: { body: string; createdAt: string; senderId: string; readAt: string | null } | null;
        unreadCount: number;
        updatedAt: string;
        blockedByMe?: boolean;
      }[]
    >('/api/messages/inbox'),
  thread: (userId: string) =>
    api<{
      threadId: string;
      otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
      messages: { id: string; body: string; createdAt: string; senderId: string; sender: { id: string; username: string } }[];
      blockedByMe?: boolean;
      blockedMe?: boolean;
      muted?: boolean;
      canSend?: boolean;
    }>(`/api/messages/with/${userId}`),
  send: (userId: string, body: string) =>
    api<unknown>(`/api/messages/with/${userId}`, { method: 'POST', body: JSON.stringify({ body }) }),
  block: (userId: string) =>
    api<{ ok: boolean; blocked: boolean }>(`/api/messages/block/${userId}`, { method: 'POST' }),
  unblock: (userId: string) =>
    api<{ ok: boolean; blocked: boolean }>(`/api/messages/block/${userId}`, { method: 'DELETE' }),
  mute: (userId: string) =>
    api<{ ok: boolean; muted: boolean }>(`/api/messages/mute/${userId}`, { method: 'POST' }),
  unmute: (userId: string) =>
    api<{ ok: boolean; muted: boolean }>(`/api/messages/mute/${userId}`, { method: 'DELETE' }),
  listBlocks: () =>
    api<{
      users: { id: string; name: string; username: string; avatarUrl?: string | null; blockedAt: string }[];
    }>('/api/messages/blocks'),
  status: (userId: string) =>
    api<DmBlockStatus>(`/api/messages/status/${userId}`, { cacheMs: 0 }),
};
