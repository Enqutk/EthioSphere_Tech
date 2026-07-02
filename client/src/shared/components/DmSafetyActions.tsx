import { useCallback, useEffect, useState } from 'react';
import { messagesApi } from '@/shared/api';

type Props = {
  userId: string;
  username: string;
  /** Called after block/unblock/mute changes */
  onChange?: () => void;
  compact?: boolean;
};

export function DmSafetyActions({ userId, username, onChange, compact }: Props) {
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await messagesApi.status(userId);
      setBlockedByMe(Boolean(data.blockedByMe));
      setMuted(Boolean(data.muted));
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleBlock() {
    if (!window.confirm(blockedByMe ? `Unblock @${username}?` : `Block @${username}? They won't be able to message you.`)) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      if (blockedByMe) {
        await messagesApi.unblock(userId);
        setBlockedByMe(false);
        setMessage('User unblocked.');
      } else {
        await messagesApi.block(userId);
        setBlockedByMe(true);
        setMessage('User blocked.');
      }
      onChange?.();
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  async function toggleMute() {
    setLoading(true);
    setMessage('');
    try {
      if (muted) {
        await messagesApi.unmute(userId);
        setMuted(false);
        setMessage('Conversation unmuted.');
      } else {
        await messagesApi.mute(userId);
        setMuted(true);
        setMessage('Conversation muted — hidden from your inbox.');
      }
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const btnClass = compact ? 'btn-secondary px-2 py-1 text-xs' : 'btn-secondary text-sm';

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-2'}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${btnClass} text-red-300/90`} disabled={loading} onClick={toggleBlock}>
          {blockedByMe ? 'Unblock' : 'Block'}
        </button>
        <button type="button" className={btnClass} disabled={loading} onClick={toggleMute}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>
      {message && <p className="text-xs text-brand-400">{message}</p>}
    </div>
  );
}
