import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '@/shared/api';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { PulseStrip } from '@/shared/components/PulseStrip';
import { RolesNeededBadges } from '@/shared/components/RolesNeededPicker';

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  visibility?: string;
  seekingReview?: boolean;
  rolesNeeded?: string[];
  githubFullName?: string | null;
  githubHtmlUrl?: string | null;
  githubData?: {
    repo?: { stargazers_count?: number; language?: string | null } | null;
  } | null;
  viewCount?: number;
  likeCount?: number;
  pulseScore?: number;
  owner: { id: string; name: string; username: string };
  members?: { role: string }[];
};

const STATUS: Record<string, string> = { PLANNING: 'Planning', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
const TYPE: Record<string, string> = { OPEN_SOURCE: 'Open source', HACKATHON: 'Hackathon', LEARNING: 'Learning' };

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    projectsApi
      .list(search ? { search } : undefined)
      .then((page) => {
        setProjects(page.items as Project[]);
        setHasMore(page.pagination.hasMore);
        setNextSkip(page.pagination.nextSkip);
      })
      .finally(() => setLoading(false));
  }, [search]);

  const loadMore = () => {
    if (loadingMore || !hasMore || nextSkip == null) return;
    setLoadingMore(true);
    projectsApi
      .list({ ...(search ? { search } : {}), skip: nextSkip })
      .then((page) => {
        setProjects((prev) => [...prev, ...(page.items as Project[])]);
        setHasMore(page.pagination.hasMore);
        setNextSkip(page.pagination.nextSkip);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-mono text-2xl font-semibold text-slate-100">Project Playground</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/buddies" className="text-sm text-brand-400 hover:underline">
            Follow builders →
          </Link>
          <Link to="/projects/new" className="btn-primary text-sm">New project</Link>
          <input type="search" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
        </div>
      </div>
      {loading ? (
        <div className="mt-12 text-center text-slate-400">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">No projects yet. Be the first to create one.</div>
      ) : (
        <ul className="mt-8 space-y-4">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="card block p-6 transition hover:border-brand-500/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-mono font-semibold text-slate-100">{p.title}</h2>
                    {p.githubFullName && (
                      <p className="mt-1 font-mono text-xs text-brand-400/90">{p.githubFullName}</p>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{STATUS[p.status] ?? p.status}</span>
                      <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{TYPE[p.type] ?? p.type}</span>
                      {p.visibility && p.visibility !== 'PUBLIC' && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">{p.visibility.replace('_', ' ')}</span>
                      )}
                      {p.seekingReview && (
                        <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">Seeking review</span>
                      )}
                    </div>
                    {p.rolesNeeded && p.rolesNeeded.length > 0 && (
                      <div className="mt-2">
                        <RolesNeededBadges roles={p.rolesNeeded} />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {p.githubData?.repo?.stargazers_count != null && <span>★ {p.githubData.repo.stargazers_count}</span>}
                      {p.githubData?.repo?.language && <span>{p.githubData.repo.language}</span>}
                    </div>
                    <div className="mt-3 border-t border-slate-800/60 pt-3">
                      <PulseStrip
                        pulse={p.pulseScore ?? 0}
                        views={p.viewCount ?? 0}
                        rep={p.likeCount ?? 0}
                        repLabel="★likes"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>by {p.owner.name} (@{p.owner.username})</div>
                    <div className="mt-2 flex justify-end">
                      <FollowCreatorActions username={p.owner.username} userId={p.owner.id} compact />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && hasMore && (
        <div className="mt-8 text-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? 'Loading…' : 'Load more projects'}
          </button>
        </div>
      )}
    </div>
  );
}
