import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/shared/components/NotificationsProvider';

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, refresh]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-surface-800 hover:text-brand-300"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-sm bg-brand-500 px-0.5 font-mono text-[10px] font-bold text-surface-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[80] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-md border border-slate-700 bg-surface-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="font-mono text-xs uppercase tracking-wide text-slate-300">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="font-mono text-[10px] uppercase text-brand-400 hover:text-brand-300"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className={n.readAt ? 'opacity-70' : ''}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 border-b border-slate-800/80 px-3 py-2.5 text-left hover:bg-surface-800"
                    onClick={() => {
                      void markRead(n.id);
                      setOpen(false);
                      if (n.linkUrl) navigate(n.linkUrl);
                    }}
                  >
                    <span className="text-sm text-slate-100">{n.title}</span>
                    {n.body ? <span className="line-clamp-2 text-xs text-slate-400">{n.body}</span> : null}
                    <span className="font-mono text-[10px] text-slate-500">{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-slate-800 px-3 py-2">
            <Link
              to="/notifications"
              className="font-mono text-[10px] uppercase tracking-wide text-slate-400 hover:text-brand-300"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
