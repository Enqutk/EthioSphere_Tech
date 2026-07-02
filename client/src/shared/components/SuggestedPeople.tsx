import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, type DiscoverUser, type FollowForViewer } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';

export function canEncourageFollow(fv: FollowForViewer | null | undefined) {
  if (!fv) return true;
  if (fv.direction === 'none' || !fv.direction) return true;
  if (fv.direction === 'outbound' && fv.status === 'REJECTED') return true;
  return false;
}

type Props = {
  limit?: number;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function SuggestedPeople({
  limit = 6,
  title = 'Developers to follow',
  subtitle = 'Follow people to unlock followers-only projects, stay on their work, and open direct messages.',
  className = '',
}: Props) {
  const { user } = useAuth();
  const [people, setPeople] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPeople([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await usersApi.discover({ limit: Math.max(limit * 3, 12) });
      setPeople(list.filter((u) => canEncourageFollow(u.followForViewer)).slice(0, limit));
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  return (
    <section className={className}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-system text-brand-400/80">Grow your network</p>
          <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100 md:text-2xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
        </div>
        <Link to="/buddies" className="shrink-0 text-sm text-brand-400 hover:underline">
          Browse all →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Finding people for you…</p>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          You&apos;re connected with everyone we surfaced for now.{' '}
          <Link to="/buddies" className="text-brand-400 hover:underline">
            Search for more
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((u) => (
            <li key={u.id} className="card flex flex-col p-4">
              <div className="flex min-w-0 gap-3">
                <Link
                  to={`/profile/${u.username}`}
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-800"
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${u.username}`} className="truncate font-mono text-sm font-semibold text-slate-100 hover:text-brand-400">
                    {u.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">@{u.username}</p>
                  {u.bio ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{u.bio}</p> : null}
                </div>
              </div>
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <FollowCreatorActions
                  username={u.username}
                  userId={u.id}
                  initialFollowForViewer={u.followForViewer ?? undefined}
                  onChanged={load}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
