import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { followApi, messagesApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

type Tab = 'messages' | 'requests';

export default function Inbox() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<Tab>('messages');
  const [threads, setThreads] = useState<
    {
      threadId: string;
      otherUser: { id: string; name: string; username: string; avatarUrl?: string | null };
      lastMessage: { body: string; createdAt: string; senderId: string } | null;
      updatedAt: string;
    }[]
  >([]);
  const [requests, setRequests] = useState<
    { id: string; follower: { id: string; name: string; username: string; avatarUrl?: string | null } }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login', { state: { from: '/inbox' } });
      return;
    }
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    Promise.all([messagesApi.inbox(token), followApi.incoming(token)])
      .then(([t, r]) => {
        setThreads(t);
        setRequests(r);
      })
      .finally(() => setLoading(false));
  }, [user, ready, navigate]);

  async function handleAccept(id: string) {
    const token = getStoredToken();
    if (!token) return;
    await followApi.accept(token, id);
    setRequests((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleReject(id: string) {
    const token = getStoredToken();
    if (!token) return;
    await followApi.reject(token, id);
    setRequests((prev) => prev.filter((x) => x.id !== id));
  }

  if (!ready || !user) return <div className="mx-auto max-w-xl px-6 py-16 text-center text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-mono text-2xl font-semibold text-slate-100">Inbox</h1>
      <p className="mt-2 text-sm text-slate-400">Direct messages and follow requests.</p>
      <div className="mt-6 flex gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setTab('messages')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'messages' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Messages
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'requests' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Follow requests {requests.length > 0 ? `(${requests.length})` : ''}
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-slate-500">Loading…</p>
      ) : tab === 'messages' ? (
        <ul className="mt-6 space-y-2">
          {threads.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">No conversations yet.</li>
          ) : (
            threads.map((row) => (
              <li key={row.threadId}>
                <Link
                  to={`/inbox/${row.otherUser.id}`}
                  className="card flex items-center gap-3 p-4 transition hover:border-brand-500/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-800 text-slate-400">
                    {row.otherUser.avatarUrl ? (
                      <img src={row.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      row.otherUser.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-200">{row.otherUser.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {row.lastMessage ? row.lastMessage.body : 'No messages yet — say hello'}
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">No pending follow requests.</li>
          ) : (
            requests.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <Link to={`/profile/${r.follower.username}`} className="flex items-center gap-2 text-slate-200 hover:text-brand-400">
                  {r.follower.avatarUrl && <img src={r.follower.avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
                  @{r.follower.username}
                </Link>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAccept(r.id)} className="btn-primary text-sm">
                    Accept
                  </button>
                  <button type="button" onClick={() => handleReject(r.id)} className="btn-secondary text-sm">
                    Decline
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
