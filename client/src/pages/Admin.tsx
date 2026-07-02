import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminApi, challengesApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { usePageMeta } from '@/shared/hooks/usePageMeta';
import { AdminOverviewCards } from '@/pages/admin/AdminOverviewCards';
import { AdminChallengeSection } from '@/pages/admin/AdminChallengeSection';
import { AdminPostsSection, AdminTrustSection } from '@/pages/admin/AdminModerationPanels';
import { AdminUsersSection } from '@/pages/admin/AdminUsersSection';
import type { AdminPost, AdminUser, ChallengeRow, Overview } from '@/pages/admin/types';

export default function Admin() {
  usePageMeta({ title: 'Admin', description: 'Programmers World admin dashboard.', path: '/admin' });

  const { user, ready } = useAuth();
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
  const [pendingCompanies, setPendingCompanies] = useState<
    Awaited<ReturnType<typeof adminApi.pendingCompanies>>
  >([]);
  const [reports, setReports] = useState<Awaited<ReturnType<typeof adminApi.reports>>>([]);
  const [banAppeals, setBanAppeals] = useState<Awaited<ReturnType<typeof adminApi.banAppeals>>>([]);

  const loadAll = useCallback(async () => {
    if (!user?.isAdmin) return;
    setError('');
    try {
      const [ov, p, u, ch, pc, rep, appeals] = await Promise.all([
        adminApi.overview(),
        adminApi.posts(),
        adminApi.users(),
        challengesApi.list(),
        adminApi.pendingCompanies(),
        adminApi.reports(),
        adminApi.banAppeals('PENDING'),
      ]);
      setOverview(ov);
      setPosts(p);
      setUsers(u);
      setChallenges(ch.challenges as ChallengeRow[]);
      setPendingCompanies(pc);
      setReports(rep);
      setBanAppeals(appeals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [user?.isAdmin]);

  useEffect(() => {
    if (ready && user?.isAdmin) loadAll();
    else if (ready) setLoading(false);
  }, [ready, user?.isAdmin, loadAll]);

  if (!ready || loading) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  }
  if (!user) {
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
    if (!user?.isAdmin) return;
    setChSaving(true);
    setError('');
    try {
      await challengesApi.create({
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
    if (!confirm('Delete this post and all its comments?')) return;
    try {
      await adminApi.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (overview) setOverview({ ...overview, posts: overview.posts - 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function deleteUserRow(id: string, username: string) {
    if (!confirm(`Permanently delete user @${username} and their data (cascades)?`)) return;
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (overview) setOverview({ ...overview, users: overview.users - 1 });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function toggleBanUser(u: AdminUser) {
    try {
      if (u.isBanned) {
        if (!window.confirm(`Unban @${u.username} and restore access?`)) return;
        await adminApi.setUserBan(u.id, { banned: false });
      } else {
        const reason = window.prompt(`Ban reason for @${u.username}:`, 'Spam or policy violation');
        if (reason === null) return;
        const daysRaw = window.prompt('Temporary ban duration in days (leave empty for permanent):', '7');
        if (daysRaw === null) return;
        const banDays = daysRaw.trim() ? Number(daysRaw.trim()) : undefined;
        if (banDays !== undefined && (!Number.isFinite(banDays) || banDays <= 0)) {
          alert('Invalid duration. Enter a positive number of days or leave empty for permanent.');
          return;
        }
        const durationLabel = banDays ? `${banDays} day(s)` : 'permanent';
        if (!window.confirm(`Ban @${u.username} (${durationLabel})? They cannot log in until restored.`)) return;
        await adminApi.setUserBan(u.id, {
          banned: true,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          ...(banDays ? { banDays } : {}),
        });
      }
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ban update failed');
    }
  }

  async function banUserById(userId: string, username: string) {
    const reason = window.prompt(`Ban @${username} — reason:`, 'Actioned from abuse report');
    if (reason === null) return;
    const daysRaw = window.prompt('Temporary ban days (empty = permanent):', '7');
    if (daysRaw === null) return;
    const banDays = daysRaw.trim() ? Number(daysRaw.trim()) : undefined;
    if (banDays !== undefined && (!Number.isFinite(banDays) || banDays <= 0)) {
      alert('Invalid duration.');
      return;
    }
    if (!window.confirm(`Ban @${username}?`)) return;
    try {
      await adminApi.setUserBan(userId, {
        banned: true,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(banDays ? { banDays } : {}),
      });
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ban failed');
    }
  }

  async function reviewAppeal(appealId: string, status: 'APPROVED' | 'REJECTED') {
    const adminNote = window.prompt('Optional note for the record:', '') ?? '';
    const unban = status === 'APPROVED' ? window.confirm('Also lift the ban and restore access?') : false;
    try {
      await adminApi.reviewBanAppeal(appealId, {
        status,
        ...(adminNote.trim() ? { adminNote: adminNote.trim() } : {}),
        ...(status === 'APPROVED' ? { unban } : {}),
      });
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not review appeal');
    }
  }

  async function deleteChallengeRow(id: string, title: string) {
    if (!confirm(`Delete challenge "${title}" and all submissions?`)) return;
    try {
      await adminApi.deleteChallenge(id);
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

      {overview && <AdminOverviewCards overview={overview} />}

      <AdminChallengeSection
        chTitle={chTitle}
        chDesc={chDesc}
        chDiff={chDiff}
        chPts={chPts}
        chOpensAt={chOpensAt}
        chClosesAt={chClosesAt}
        chSaving={chSaving}
        challenges={challenges}
        onTitleChange={setChTitle}
        onDescChange={setChDesc}
        onDiffChange={setChDiff}
        onPtsChange={setChPts}
        onOpensAtChange={setChOpensAt}
        onClosesAtChange={setChClosesAt}
        onSubmit={handleCreateChallenge}
        onDeleteChallenge={deleteChallengeRow}
      />

      <AdminPostsSection posts={posts} onDeletePost={deletePost} />

      <AdminUsersSection
        users={users}
        currentUserId={user.id}
        onToggleBan={toggleBanUser}
        onDeleteUser={deleteUserRow}
      />

      <AdminTrustSection
        pendingCompanies={pendingCompanies}
        reports={reports}
        banAppeals={banAppeals}
        onReload={loadAll}
        onBanUser={banUserById}
        onReviewAppeal={reviewAppeal}
      />
    </div>
  );
}
