import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { messagesApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { DmSafetyActions } from '@/shared/components/DmSafetyActions';

type MsgRow = { id: string; body: string; createdAt: string; senderId: string };

export default function InboxChat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [otherName, setOtherName] = useState('');
  const [otherUsername, setOtherUsername] = useState('');
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [canSend, setCanSend] = useState(true);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login', { state: { from: userId ? `/inbox/${userId}` : '/inbox' } });
      return;
    }
    if (!userId) return;
    if (userId === user.id) {
      navigate('/inbox');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setMessages([]);
    setOtherName('');
    setOtherUsername('');

    messagesApi
      .thread(userId)
      .then((data) => {
        if (cancelled) return;
        setOtherName(data.otherUser.name);
        setOtherUsername(data.otherUser.username);
        setMessages(data.messages as MsgRow[]);
        setCanSend(data.canSend !== false);
        setBlockedByMe(Boolean(data.blockedByMe));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMessages([]);
        setError(err instanceof Error ? err.message : 'Could not load messages');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, ready, userId, navigate, reloadKey]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !userId || !text.trim() || !canSend) return;
    setSending(true);
    setError('');
    try {
      await messagesApi.send(userId, text.trim());
      setText('');
      const data = await messagesApi.thread(userId);
      setOtherName(data.otherUser.name);
      setOtherUsername(data.otherUser.username);
      setMessages(data.messages as MsgRow[]);
      setCanSend(data.canSend !== false);
      setBlockedByMe(Boolean(data.blockedByMe));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <Link to="/inbox" className="text-sm text-slate-400 hover:text-brand-400">← Inbox</Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-mono text-xl font-semibold text-slate-100">
          {loading ? '…' : otherName}{' '}
          <span className="text-sm font-normal text-slate-500">@{otherUsername}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {otherUsername ? (
            <Link to={`/profile/${otherUsername}`} className="text-xs text-brand-400 hover:underline">Profile</Link>
          ) : null}
          {userId && otherUsername ? (
            <DmSafetyActions
              userId={userId}
              username={otherUsername}
              compact
              onChange={() => setReloadKey((n) => n + 1)}
            />
          ) : null}
        </div>
      </div>
      {blockedByMe && !error && (
        <p className="mt-3 text-sm text-amber-300/90">You blocked this user — unblock to send new messages.</p>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}
      <div className="mt-6 flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-surface-900/50">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-slate-500">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500">Start the conversation.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-brand-600/30 text-slate-100' : 'bg-surface-800 text-slate-300'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form onSubmit={handleSend} className="border-t border-slate-800 p-3">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input min-h-[44px] flex-1 resize-none py-2"
              placeholder={canSend ? 'Write a message…' : 'Messaging is disabled for this conversation.'}
              rows={2}
              disabled={!canSend}
            />
            <button type="submit" className="btn-primary self-end px-4" disabled={sending || !text.trim() || !canSend}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
