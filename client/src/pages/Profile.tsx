import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Profile = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  githubUrl?: string | null;
  skills?: string[];
  projectsOwned?: { id: string; title: string; status: string; type?: string }[];
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
    if (!username) return;
    usersApi.getByUsername(username).then((data) => setProfile(data as Profile)).catch(() => setError('Profile not found')).finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-slate-400">Loading profile…</div>;
  if (error || !profile) return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-red-400">{error || 'Not found'}</div>;

  const isOwn = me?.username === profile.username;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
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
            <span className="mt-2 inline-block rounded-full bg-brand-500/20 px-3 py-0.5 text-sm font-medium text-brand-400">{RANK_LABELS[profile.rank] || profile.rank}</span>
            {profile.bio && <p className="mt-3 text-slate-300">{profile.bio}</p>}
            {profile.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-brand-400 hover:underline">GitHub →</a>
            )}
          </div>
          {isOwn && token && (
            <Link to="/profile/edit" className="btn-secondary">Edit profile</Link>
          )}
        </div>
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-md bg-surface-800 px-2 py-1 text-sm text-slate-300">{s}</span>
              ))}
            </div>
          </div>
        )}
        {profile.projectsOwned && profile.projectsOwned.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Projects</h2>
            <ul className="mt-2 space-y-2">
              {profile.projectsOwned.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="text-brand-400 hover:underline">{p.title}</Link>
                  <span className="ml-2 text-xs text-slate-500">{p.status}</span>
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
