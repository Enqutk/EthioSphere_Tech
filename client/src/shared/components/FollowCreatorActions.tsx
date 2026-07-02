import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { followApi, type FollowForViewer } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';

type Props = {
  username: string;
  userId: string;
  /** When provided, skip the initial /follow/state fetch (e.g. discover cards already have this). */
  initialFollowForViewer?: FollowForViewer | null;
  onChanged?: () => void;
  className?: string;
  /** Smaller buttons for list cards */
  compact?: boolean;
};

export function FollowCreatorActions({ username, userId, initialFollowForViewer, onChanged, className, compact }: Props) {
  const { user } = useAuth();
  const [fv, setFv] = useState<FollowForViewer | null | undefined>(initialFollowForViewer ?? undefined);
  const [loading, setLoading] = useState(initialFollowForViewer === undefined && !!user);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const r = await followApi.state(username);
      if (r.self) setFv(null);
      else setFv(r.followForViewer);
    } catch {
      setFv(null);
    }
    onChanged?.();
  }, [username, onChanged, user]);

  useEffect(() => {
    if (initialFollowForViewer !== undefined) {
      setFv(initialFollowForViewer);
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    followApi
      .state(username)
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
  }, [username, user, initialFollowForViewer]);

  if (user?.username?.toLowerCase() === username.toLowerCase()) return null;

  if (!user) {
    return (
      <div className={className}>
        <Link to="/login" state={{ from: window.location.pathname }} className="text-sm text-brand-400 hover:underline">
          Sign in to follow @{username}
        </Link>
      </div>
    );
  }

  const btn = compact ? 'text-xs py-1 px-2' : 'text-xs py-1 px-2';
  const followTitle = 'Follow to see their followers-only projects and message them once they accept';

  if (loading || fv === undefined) {
    return <span className={`text-xs text-slate-500 ${className ?? ''}`}>…</span>;
  }

  if (fv === null) return null;

  const wrap = (inner: ReactNode) => <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>{inner}</div>;

  return wrap(
    <>
      {(!compact || fv.direction === 'outbound' && fv.status === 'ACCEPTED') && (
        <Link to={`/inbox/${userId}`} className={`btn-secondary ${btn}`}>
          Message
        </Link>
      )}
      {fv.direction === 'none' || !fv.direction ? (
        <button
          type="button"
          className={`btn-primary ${btn}`}
          title={followTitle}
          onClick={async () => {
            await followApi.follow(username);
            await refresh();
          }}
        >
          Follow
        </button>
      ) : null}
      {fv.direction === 'outbound' && fv.status === 'PENDING' && (
        <button
          type="button"
          className={`btn-secondary ${btn}`}
          onClick={async () => {
            await followApi.unfollow(username);
            await refresh();
          }}
        >
          Cancel request
        </button>
      )}
      {fv.direction === 'outbound' && fv.status === 'ACCEPTED' && (
        <button
          type="button"
          className={`btn-secondary ${btn}`}
          onClick={async () => {
            await followApi.unfollow(username);
            await refresh();
          }}
        >
          Unfollow
        </button>
      )}
      {fv.direction === 'outbound' && fv.status === 'REJECTED' && (
        <button
          type="button"
          className={`btn-primary ${btn}`}
          title={followTitle}
          onClick={async () => {
            await followApi.follow(username);
            await refresh();
          }}
        >
          Follow again
        </button>
      )}
      {fv.direction === 'inbound' && fv.status === 'PENDING' && fv.id && (
        <>
          <span className="text-xs text-amber-400">Wants to follow you</span>
          <button
            type="button"
            className="btn-primary text-xs py-1 px-2"
            onClick={async () => {
              await followApi.accept(fv.id!);
              await refresh();
            }}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn-secondary text-xs py-1 px-2"
            onClick={async () => {
              await followApi.reject(fv.id!);
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
