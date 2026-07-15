import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/shared/api/http';

let socket: Socket | null = null;

/** Socket connects to API origin (or same-origin in dev via Vite proxy). */
export function getNotificationsSocket(): Socket {
  if (socket) return socket;
  const base = getApiBaseUrl() || undefined;
  socket = io(base || undefined, {
    path: '/socket.io',
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectNotificationsSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
