import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { followApi, type FollowForViewer } from '@/shared/api';
import { useAuth, getStoredToken } from '@/shared/components/AuthProvider';

type Props = {
  username: string;
  userId: string;
  /** When provided, skip the initial /follow/state fetch (e.g. discover cards already have this). */
  initialFollowForViewer?: FollowForViewer | null;
  onChanged?: () => void;
  className?: string;
};

export function FollowCreatorActions({ username, userId, initialFollowForViewer, onChanged, className }: Props) {
  const { user } = useAuth();
  const token = getStoredToken();
  const [fv, setFv] = useState<FollowForViewer | null | undefined>(initialFollowForViewer ?? undefined);
  const [loading, setLoading] = useState(initialFollowForViewer === undefined && !!token);

  const refresh = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    try {
      const r = await followApi.state(t, username);
      if (r.self) setFv(null);
      else setFv(r.followForViewer);
    } catch {
      setFv(null);
    }
    onChanged?.();
  }, [username, onChanged]);

  useEffect(() => {
    if (initialFollowForViewer !== undefined) {
      setFv(initialFollowForViewer);
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    followApi
      .state(token, username)
      .then((r) => {
        if (cancelled) return;
        if (r.self) setFv(null);
        else setFv(r.followForViewer);
      })
      .catch(() => {
        if (!cancelled) setFv(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, token, initialFollowForViewer]);

  if (user?.username?.toLowerCase() === username.toLowerCase()) return null;

  if (!token) {
    return (
      <div className={className}>
        <Link to="/login" state={{ from: window.location.pathname }} className="text-sm text-brand-400 hover:underline">
          Log in to follow
        </Link>
      </div>
    );
  }

  if (loading || fv === undefined) {
    return <span className={`text-xs text-slate-500 ${className ?? ''}`}>…</span>;
  }

  if (fv === null) return null;

  const wrap = (inner: ReactNode) => <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>{inner}</div>;

  return wrap(
    <>
      <Link to={`/inbox/${userId}`} className="btn-secondary text-xs py-1 px-2">
        Message
      </Link>
      {fv.direction === 'none' || !fv.direction ? (
        <button
          type="button"
          className="btn-primary text-xs py-1 px-2"
          onClick={async () => {
            const t = getStoredToken();
            if (!t) return;
            await followApi.follow(t, username);
            await refresh();
          }}
        >
          Request follow
        </button>
      ) : null}
      {fv.direction === 'outbound' && fv.status === 'PENDING' && (
        <button
          type="button"
          className="btn-secondary text-xs py-1 px-2"
          onClick={async () => {
            const t = getStoredToken();
            if (!t) return;
            await followApi.unfollow(t, username);
            await refresh();
          }}
        >
          Cancel request
        </button>
      )}
      {fv.direction === 'outbound' && fv.status === 'ACCEPTED' && (
        <button
          type="button"
          className="btn-secondary text-xs py-1 px-2"
          onClick={async () => {
            const t = getStoredToken();
            if (!t) return;
            await followApi.unfollow(t, username);
            await refresh();
          }}
        >
          Unfollow
        </button>
      )}
      {fv.direction === 'outbound' && fv.status === 'REJECTED' && (
        <button
          type="button"
          className="btn-primary text-xs py-1 px-2"
          onClick={async () => {
            const t = getStoredToken();
            if (!t) return;
            await followApi.follow(t, username);
            await refresh();
          }}
        >
          Request follow
        </button>
      )}
      {fv.direction === 'inbound' && fv.status === 'PENDING' && fv.id && (
        <>
          <span className="text-xs text-amber-400">Wants to follow you</span>
          <button
            type="button"
            className="btn-primary text-xs py-1 px-2"
            onClick={async () => {
              const t = getStoredToken();
              if (!t) return;
              await followApi.accept(t, fv.id!);
              await refresh();
            }}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn-secondary text-xs py-1 px-2"
            onClick={async () => {
              const t = getStoredToken();
              if (!t) return;
              await followApi.reject(t, fv.id!);
              await refresh();
            }}
          >
            Decline
          </button>
        </>
      )}
    </>,
  );
}
