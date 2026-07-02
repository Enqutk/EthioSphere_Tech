import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usersApi, type DiscoverUser } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { PRIMARY_DISCIPLINES, DISCIPLINE_LABELS } from '@/shared/constants/disciplines';

const SECTIONS: Record<string, string> = {
  GENERAL: 'General',
  DEBUG_HELP: 'Debug help',
  PROJECT_FEEDBACK: 'Feedback',
  ANNOUNCEMENTS: 'Announcements',
  REACT: 'React',
  NODE: 'Node',
  PYTHON: 'Python',
  OTHER: 'Other',
};

export default function FindBuddies() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') ?? '';
  const skillParam = searchParams.get('skill') ?? '';
  const disciplineParam = searchParams.get('discipline') ?? '';

  const [qInput, setQInput] = useState(qParam);
  const [skillInput, setSkillInput] = useState(skillParam);
  const [disciplineInput, setDisciplineInput] = useState(disciplineParam);
  const [people, setPeople] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await usersApi.discover({
          q: qParam || undefined,
          skill: skillParam || undefined,
          discipline: disciplineParam || undefined,
          limit: 32,
        });
      setPeople(list);
    } catch (e) {
      setPeople([]);
      setError(e instanceof Error ? e.message : 'Could not load people');
    } finally {
      setLoading(false);
    }
  }, [qParam, skillParam, disciplineParam]);

  useEffect(() => {
    setQInput(qParam);
    setSkillInput(skillParam);
    setDisciplineInput(disciplineParam);
  }, [qParam, skillParam, disciplineParam]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (qInput.trim()) next.set('q', qInput.trim());
    if (skillInput.trim()) next.set('skill', skillInput.trim());
    if (disciplineInput.trim()) next.set('discipline', disciplineInput.trim());
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-400">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-400">Find buddies</span>
      </div>
      <h1 className="font-mono text-2xl font-semibold text-slate-100">Find buddies</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Search by name, username, or bio. Filter by discipline or skill tag. Follow creators and peek at their public projects and community posts.
      </p>

      <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="buddy-q" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            id="buddy-q"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Name, @username, or keywords…"
            className="input mt-1 w-full"
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="buddy-discipline" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Discipline
          </label>
          <select
            id="buddy-discipline"
            value={disciplineInput}
            onChange={(e) => setDisciplineInput(e.target.value)}
            className="input mt-1 w-full"
          >
            <option value="">Any</option>
            {PRIMARY_DISCIPLINES.map((d) => (
              <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="buddy-skill" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Skill (exact tag)
          </label>
          <input
            id="buddy-skill"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="e.g. React"
            className="input mt-1 w-full"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="mt-10 text-center text-slate-400">Loading…</p>
      ) : people.length === 0 ? (
        <p className="mt-10 text-center text-slate-500">No one matches yet. Try different words or clear filters.</p>
      ) : (
        <ul className="mt-10 space-y-6">
          {people.map((u) => (
            <li key={u.id} className="card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-4">
                  <Link
                    to={`/profile/${u.username}`}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface-800"
                  >
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-slate-500">{u.name.charAt(0).toUpperCase()}</div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link to={`/profile/${u.username}`} className="font-mono text-lg font-semibold text-slate-100 hover:text-brand-400">
                      {u.name}
                    </Link>
                    <p className="text-sm text-slate-400">@{u.username}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {u.primaryDiscipline && u.primaryDiscipline !== 'DEVELOPER'
                        ? u.disciplineLabel
                        : u.rankLabel ?? u.rank}
                    </p>
                    {u.bio ? <p className="mt-2 line-clamp-2 text-sm text-slate-300">{u.bio}</p> : null}
                    {u.skills && u.skills.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {u.skills.slice(0, 8).map((s) => (
                          <span key={s} className="rounded-md bg-surface-800 px-2 py-0.5 text-xs text-slate-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <FollowCreatorActions
                  username={u.username}
                  userId={u.id}
                  initialFollowForViewer={user ? u.followForViewer ?? undefined : undefined}
                  onChanged={load}
                  className="sm:justify-end"
                />
              </div>

              {(u.projectsOwned?.length > 0 || u.posts?.length > 0) && (
                <div className="mt-6 grid gap-4 border-t border-slate-800 pt-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Public projects</h3>
                    {u.projectsOwned?.length ? (
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {u.projectsOwned.map((p) => (
                          <li key={p.id}>
                            <Link to={`/projects/${p.id}`} className="text-brand-400 hover:underline">
                              {p.title}
                            </Link>
                            {p.githubFullName ? <span className="ml-1 text-xs text-slate-500">· {p.githubFullName}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">No public projects yet.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Community</h3>
                    {u.posts?.length ? (
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {u.posts.map((p) => (
                          <li key={p.id}>
                            <Link to={`/community/${p.id}`} className="text-brand-400 hover:underline">
                              {p.title}
                            </Link>
                            <span className="ml-1 text-xs text-slate-500">· {SECTIONS[p.section] ?? p.section}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">No posts yet.</p>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
