import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { messagesApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

export default function InboxChat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [otherName, setOtherName] = useState('');
  const [otherUsername, setOtherUsername] = useState('');
  const [messages, setMessages] = useState<{ id: string; body: string; createdAt: string; senderId: string }[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    const token = getStoredToken();
    if (!token || !userId) return;
    messagesApi
      .thread(token, userId)
      .then((data) => {
        setOtherName(data.otherUser.name);
        setOtherUsername(data.otherUser.username);
        setMessages(data.messages as { id: string; body: string; createdAt: string; senderId: string }[]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!userId) return;
    if (userId === user.id) {
      navigate('/inbox');
      return;
    }
    setLoading(true);
    load();
  }, [user, ready, userId, navigate]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token || !userId || !text.trim()) return;
    setSending(true);
    try {
      await messagesApi.send(token, userId, text.trim());
      setText('');
      load();
    } finally {
      setSending(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <Link to="/inbox" className="text-sm text-slate-400 hover:text-brand-400">← Inbox</Link>
      <div className="mt-4 flex items-center justify-between gap-2">
        <h1 className="font-mono text-xl font-semibold text-slate-100">
          {loading ? '…' : otherName}{' '}
          <span className="text-sm font-normal text-slate-500">@{otherUsername}</span>
        </h1>
        <Link to={`/profile/${otherUsername}`} className="text-xs text-brand-400 hover:underline">Profile</Link>
      </div>
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
              placeholder="Write a message…"
              rows={2}
            />
            <button type="submit" className="btn-primary self-end px-4" disabled={sending || !text.trim()}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
