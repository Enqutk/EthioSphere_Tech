import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { useNotifications } from '@/shared/components/NotificationsProvider';

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const { items, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (ready && !user) navigate('/login', { replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!ready || !user) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold text-slate-100">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are caught up'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button type="button" className="btn-secondary text-xs" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">No notifications yet. Likes, messages, and follows will show up here.</p>
      ) : (
        <ul className="divide-y divide-slate-800 border border-slate-800">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-900 ${
                  n.readAt ? 'opacity-70' : 'bg-brand-500/5'
                }`}
                onClick={() => {
                  void markRead(n.id);
                  if (n.linkUrl) navigate(n.linkUrl);
                }}
              >
                <span className="text-sm font-medium text-slate-100">{n.title}</span>
                {n.body ? <span className="text-sm text-slate-400">{n.body}</span> : null}
                <span className="font-mono text-[10px] text-slate-500">{timeLabel(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-slate-500">
        Prefer email alerts? Tune them in{' '}
        <Link to="/settings" className="text-brand-400 hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
