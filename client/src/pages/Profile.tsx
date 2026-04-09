import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { followApi, usersApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';

type Profile = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  profileSections?: { title: string; content: string }[];
  followersCount?: number;
  followingCount?: number;
  followForViewer?: {
    direction: string;
    status: string | null;
    id: string | null;
  } | null;
  projectsOwned?: {
    id: string;
    title: string;
    status: string;
    type?: string;
    visibility?: string;
    seekingReview?: boolean;
    githubFullName?: string | null;
    githubHtmlUrl?: string | null;
  }[];
  badges?: { badgeType: string; earnedAt: string }[];
};

const RANK_LABELS: Record<string, string> = {
  NEWBIE: 'Newbie',
  JUNIOR_DEV: 'Junior Dev',
  PRO_DEV: 'Pro Dev',
  ELITE_ARCHITECT: 'Elite Architect',
};

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: me, token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username?.trim()) {
      setLoading(false);
      setError('Invalid profile link');
      setProfile(null);
      return;
    }
    setLoading(true);
    setError('');
    setProfile(null);
    const u = username.trim().toLowerCase();
    usersApi
      .getByUsername(u, token)
      .then((data) => setProfile(data as Profile))
      .catch((err) => {
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Could not load profile');
      })
      .finally(() => setLoading(false));
  }, [username, token]);

  async function reloadProfile() {
    if (!username?.trim()) return;
    const u = username.trim().toLowerCase();
    const data = await usersApi.getByUsername(u, token);
    setProfile(data as Profile);
  }

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-slate-400">Loading profile…</div>;
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-400">{error || 'Profile not found'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand-400 hover:underline">Back to home</Link>
      </div>
    );
  }

  const isOwn = me?.username?.toLowerCase() === profile.username?.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-400">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-slate-400">@{profile.username}</span>
      </div>
      <div className="card p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-800">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-slate-500">{profile.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-mono text-2xl font-semibold text-slate-100">{profile.name}</h1>
            <p className="text-slate-400">@{profile.username}</p>
            <p className="mt-1 text-xs text-slate-500">
              {profile.followersCount ?? 0} followers · {profile.followingCount ?? 0} following
            </p>
            <span className="mt-2 inline-block rounded-full bg-brand-500/20 px-3 py-0.5 text-sm font-medium text-brand-400">{RANK_LABELS[profile.rank] || profile.rank}</span>
            {profile.bio ? (
              <p className="mt-3 text-slate-300">{profile.bio}</p>
            ) : isOwn ? (
              <p className="mt-3 text-sm text-slate-500">
                No bio yet.{' '}
                <Link to="/profile/edit" className="text-brand-400 hover:underline">Add one</Link>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 hover:underline">
                  GitHub →
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {isOwn && (
              <Link to="/profile/edit" className="btn-secondary">Edit profile</Link>
            )}
            {!isOwn && token && (
              <div className="flex flex-wrap gap-2">
                <Link to={`/inbox/${profile.id}`} className="btn-secondary text-sm">Message</Link>
                {profile.followForViewer?.direction === 'none' || !profile.followForViewer ? (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={async () => {
                      await followApi.follow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Request follow
                  </button>
                ) : null}
                {profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'PENDING' && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await followApi.unfollow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Cancel request
                  </button>
                )}
                {profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await followApi.unfollow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Unfollow
                  </button>
                )}
                {profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'REJECTED' && (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={async () => {
                      await followApi.follow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Request follow
                  </button>
                )}
                {profile.followForViewer?.direction === 'inbound' && profile.followForViewer.status === 'PENDING' && profile.followForViewer.id && (
                  <>
                    <span className="self-center text-xs text-amber-400">Wants to follow you</span>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={async () => {
                        await followApi.accept(token, profile.followForViewer!.id!);
                        await reloadProfile();
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={async () => {
                        await followApi.reject(token, profile.followForViewer!.id!);
                        await reloadProfile();
                      }}
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {profile.portfolioUrl ? (
          <div className="mt-6 rounded-lg border border-brand-600/40 bg-surface-950/60 p-5">
            <p className="label-system">Hosted portfolio</p>
            <div className="mt-4">
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                Open portfolio ↗
              </a>
            </div>
          </div>
        ) : isOwn ? (
          <div className="mt-6 rounded-lg border border-dashed border-brand-900/50 bg-surface-950/40 p-4 text-sm text-slate-500">
            <span className="font-mono text-xs text-brand-500/80">[PORTFOLIO]</span>{' '}
            Link a self-hosted mini-site from{' '}
            <Link to="/profile/edit" className="text-brand-400 hover:underline">edit profile</Link>.
          </div>
        ) : null}

        <div className="mt-6 border-t border-slate-700 pt-6">
          <h2 className="font-mono text-sm font-medium text-slate-400">Skills</h2>
          {profile.skills && profile.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-md bg-surface-800 px-2 py-1 text-sm text-slate-300">{s}</span>
              ))}
            </div>
          ) : isOwn ? (
            <p className="mt-2 text-sm text-slate-500">
              <Link to="/profile/edit" className="text-brand-400 hover:underline">Add skills</Link> on your profile.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No skills listed.</p>
          )}
        </div>
        {profile.profileSections && profile.profileSections.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            {profile.profileSections.map((s, i) => (
              <section key={`${s.title}-${i}`} className={i > 0 ? 'mt-6' : ''}>
                <h2 className="font-mono text-sm font-medium uppercase tracking-wide text-slate-400">{s.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{s.content}</p>
              </section>
            ))}
          </div>
        )}
        {profile.projectsOwned && profile.projectsOwned.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Projects</h2>
            <ul className="mt-2 space-y-2">
              {profile.projectsOwned.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Link to={`/projects/${p.id}`} className="text-brand-400 hover:underline">{p.title}</Link>
                  <span className="text-xs text-slate-500">{p.status}</span>
                  {p.seekingReview && (
                    <span className="text-xs text-brand-400">review</span>
                  )}
                  {p.githubHtmlUrl && p.githubFullName && (
                    <a href={p.githubHtmlUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-brand-400">
                      {p.githubFullName} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.badges && profile.badges.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Badges</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.badges.map((b) => (
                <span key={b.badgeType} className="rounded-md bg-amber-500/20 px-2 py-1 text-sm text-amber-400">{b.badgeType}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
