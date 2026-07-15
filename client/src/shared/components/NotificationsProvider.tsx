import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { notificationsApi, type AppNotification } from '@/shared/api/notifications';
import { useAuth } from '@/shared/components/AuthProvider';
import { getNotificationsSocket, disconnectNotificationsSocket } from '@/shared/lib/notificationsSocket';
import { syncPushTokenIfPossible } from '@/shared/lib/firebasePush';

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [list, countRes] = await Promise.all([
        notificationsApi.list({ limit: 40 }),
        notificationsApi.unreadCount(),
      ]);
      setItems(list);
      setUnreadCount(countRes.count);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  useEffect(() => {
    if (!user) {
      disconnectNotificationsSocket();
      return;
    }

    const socket = getNotificationsSocket();
    socket.connect();

    const onNew = (payload: AppNotification) => {
      setItems((prev) => [payload, ...prev.filter((n) => n.id !== payload.id)].slice(0, 40));
      setUnreadCount((c) => c + 1);
    };
    const onRead = ({ id }: { id: string }) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    };
    const onReadAll = () => {
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    };

    socket.on('notification:new', onNew);
    socket.on('notification:read', onRead);
    socket.on('notification:read-all', onReadAll);

    void syncPushTokenIfPossible();

    return () => {
      socket.off('notification:new', onNew);
      socket.off('notification:read', onRead);
      socket.off('notification:read-all', onReadAll);
      socket.disconnect();
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    const wasUnread = items.some((n) => n.id === id && !n.readAt);
    try {
      const updated = await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }, [items]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ items, unreadCount, loading, refresh, markRead, markAllRead }),
    [items, unreadCount, loading, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
