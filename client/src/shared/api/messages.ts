import { api } from './http';

export const messagesApi = {
  inbox: () =>
    api<
      {
        threadId: string;
        otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
        lastMessage: { body: string; createdAt: string; senderId: string; readAt: string | null } | null;
        unreadCount: number;
        updatedAt: string;
      }[]
    >('/api/messages/inbox'),
  thread: (userId: string) =>
    api<{
      threadId: string;
      otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
      messages: { id: string; body: string; createdAt: string; senderId: string; sender: { id: string; username: string } }[];
    }>(`/api/messages/with/${userId}`),
  send: (userId: string, body: string) =>
    api<unknown>(`/api/messages/with/${userId}`, { method: 'POST', body: JSON.stringify({ body }) }),
};
