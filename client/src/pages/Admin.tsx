import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminApi, challengesApi } from '@/shared/api';
import { useAuth, getStoredToken } from '@/shared/components/AuthProvider';

type Overview = { users: number; posts: number; challenges: number; projects: number };
type AdminPost = {
  id: string;
  title: string;
  section: string;
  createdAt: string;
  author: { id: string; username: string; name: string };
};
type AdminUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  _count: { posts: number; projectsOwned: number };
};
type ChallengeRow = {
  id: string;
  title: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
  submissionOpensAt?: string | null;
  submissionClosesAt?: string | null;
};

const SECTION_LABEL: Record<string, string> = {
  GENERAL: 'General',
  DEBUG_HELP: 'Debug help',
  PROJECT_FEEDBACK: 'Project feedback',
  ANNOUNCEMENTS: 'Announcements',
  REACT: 'React',
  NODE: 'Node',
  PYTHON: 'Python',
  OTHER: 'Other',
};

export default function Admin() {
  const { user, ready } = useAuth();
  const token = getStoredToken();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chTitle, setChTitle] = useState('');
  const [chDesc, setChDesc] = useState('');
  const [chDiff, setChDiff] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [chPts, setChPts] = useState(10);
  const [chOpensAt, setChOpensAt] = useState('');
  const [chClosesAt, setChClosesAt] = useState('');
  const [chSaving, setChSaving] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [ov, p, u, ch] = await Promise.all([
        adminApi.overview(token),
        adminApi.posts(token),
        adminApi.users(token),
        challengesApi.list(undefined, token),
      ]);
      setOverview(ov);
      setPosts(p);
      setUsers(u);
      setChallenges(ch.challenges as ChallengeRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && user?.isAdmin && token) loadAll();
    else if (ready) setLoading(false);
  }, [ready, user?.isAdmin, token, loadAll]);

  if (!ready || loading) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  }
  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }
  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-slate-300">You don&apos;t have access to the admin panel.</p>
        <Link to="/" className="mt-4 inline-block text-brand-400 hover:underline">Back home</Link>
      </div>
    );
  }

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setChSaving(true);
    setError('');
    try {
      await challengesApi.create(token, {
        title: chTitle.trim(),
        description: chDesc.trim(),
        difficulty: chDiff,
        rewardPoints: chPts,
        ...(chOpensAt.trim() ? { submissionOpensAt: new Date(chOpensAt).toISOString() } : {}),
        ...(chClosesAt.trim() ? { submissionClosesAt: new Date(chClosesAt).toISOString() } : {}),
      });
      setChTitle('');
      setChDesc('');
      setChDiff('MEDIUM');
      setChPts(10);
      setChOpensAt('');
      setChClosesAt('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create challenge');
    } finally {
      setChSaving(false);
    }
  }

  async function deletePost(id: string) {
    if (!token || !confirm('Delete this post and all its comments?')) return;
    try {
      await adminApi.deletePost(token, id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (overview) setOverview({ ...overview, posts: overview.posts - 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function deleteUserRow(id: string, username: string) {
    if (!token || !confirm(`Permanently delete user @${username} and their data (cascades)?`)) return;
    try {
      await adminApi.deleteUser(token, id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (overview) setOverview({ ...overview, users: overview.users - 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function deleteChallengeRow(id: string, title: string) {
    if (!token || !confirm(`Delete challenge "${title}" and all submissions?`)) return;
    try {
      await adminApi.deleteChallenge(token, id);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      if (overview) setOverview({ ...overview, challenges: overview.challenges - 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400">Admin</p>
          <h1 className="font-mono text-2xl font-semibold text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage challenges, community posts, and users.</p>
        </div>
        <Link to="/" className="text-sm text-slate-400 hover:text-brand-400">← Home</Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {overview && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Users', overview.users],
            ['Posts', overview.posts],
            ['Challenges', overview.challenges],
            ['Projects', overview.projects],
          ].map(([label, n]) => (
            <div key={label} className="card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-2xl text-slate-100">{n}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Create challenge</h2>
        <form onSubmit={handleCreateChallenge} className="card mt-4 space-y-4 p-6">
          <div>
            <label className="block text-sm text-slate-300">Title</label>
            <input value={chTitle} onChange={(e) => setChTitle(e.target.value)} className="input mt-1" required />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Description</label>
            <textarea value={chDesc} onChange={(e) => setChDesc(e.target.value)} className="input mt-1 min-h-[100px]" required />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-slate-300">Difficulty</label>
              <select value={chDiff} onChange={(e) => setChDiff(e.target.value as typeof chDiff)} className="input mt-1">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Points</label>
              <input
                type="number"
                min={0}
                value={chPts}
                onChange={(e) => setChPts(Number(e.target.value))}
                className="input mt-1 w-28"
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-surface-950/50 p-4">
            <p className="text-sm font-medium text-slate-300">Submission window (optional)</p>
            <p className="mt-1 text-xs text-slate-500">
              If you set a <strong className="text-slate-400">close</strong> time, other people&apos;s solutions stay hidden until
              then; after it passes, everyone sees a public timeline (GitHub links and order of submission).
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">Opens at (local)</label>
                <input
                  type="datetime-local"
                  value={chOpensAt}
                  onChange={(e) => setChOpensAt(e.target.value)}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Closes at (local)</label>
                <input
                  type="datetime-local"
                  value={chClosesAt}
                  onChange={(e) => setChClosesAt(e.target.value)}
                  className="input mt-1 w-full"
                />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={chSaving}>
            {chSaving ? 'Creating…' : 'Create challenge'}
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Challenges</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Pts</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {c.title}
                    {c.submissionClosesAt && (
                      <span className="mt-1 block text-xs font-normal text-violet-400">
                        Closes {new Date(c.submissionClosesAt).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.difficulty}</td>
                  <td className="px-4 py-3">{c.rewardPoints}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => deleteChallengeRow(c.id, c.title)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Community posts</h2>
        <p className="mt-1 text-xs text-slate-500">Latest 100 posts. Deleting removes comments and votes.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3 max-w-xs truncate">
                    <Link to={`/community/${p.id}`} className="text-brand-400 hover:underline">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{SECTION_LABEL[p.section] ?? p.section}</td>
                  <td className="px-4 py-3">@{p.author.username}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => deletePost(p.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Users</h2>
        <p className="mt-1 text-xs text-slate-500">Cannot delete yourself or other admins from here.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3">
                    <Link to={`/profile/${u.username}`} className="font-mono text-brand-400 hover:underline">@{u.username}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">{u.isAdmin ? <span className="text-amber-400">Admin</span> : 'Member'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u._count.posts} posts · {u._count.projectsOwned} projects
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== user.id && !u.isAdmin ? (
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:underline"
                        onClick={() => deleteUserRow(u.id, u.username)}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
