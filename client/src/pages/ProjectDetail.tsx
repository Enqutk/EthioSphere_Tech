import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { projectsApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { getStoredToken } from '@/shared/components/AuthProvider';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { ReadmePreview } from '@/shared/components/ReadmePreview';
import { PulseStrip } from '@/shared/components/PulseStrip';
import { RolesNeededPicker, RolesNeededBadges } from '@/shared/components/RolesNeededPicker';
import {
  PROJECT_TEAM_ROLES,
  PROJECT_ROLE_LABELS,
  type ProjectTeamRole,
  type PrimaryDiscipline,
} from '@/shared/constants/disciplines';

type GithubRepoInfo = {
  full_name?: string;
  html_url?: string;
  name?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  subscribers_count?: number;
  default_branch?: string;
  homepage?: string | null;
  topics?: string[];
  archived?: boolean;
  disabled?: boolean;
  fork?: boolean;
  parent?: string | null;
  pushed_at?: string;
  created_at?: string;
  updated_at?: string;
  size?: number;
  language?: string | null;
  visibility?: string;
  owner?: { login?: string; avatar_url?: string; html_url?: string; type?: string } | null;
  license?: { key?: string; name?: string; spdx_id?: string } | null;
};

type GithubContributor = {
  login: string;
  avatar_url?: string;
  html_url?: string;
  contributions?: number;
};

type GithubDataBundle = {
  repo?: GithubRepoInfo | null;
  languages?: Record<string, number>;
  readme?: string | null;
  contributors?: GithubContributor[];
};

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  visibility?: string;
  seekingReview?: boolean;
  rolesNeeded?: string[];
  githubHtmlUrl?: string | null;
  githubFullName?: string | null;
  githubData?: GithubDataBundle | null;
  githubSyncedAt?: string | null;
  viewCount?: number;
  likeCount?: number;
  pulseScore?: number;
  likedByViewer?: boolean;
  owner: { id: string; name: string; username: string; avatarUrl?: string | null; rank: string };
  members: { role: string; user: { id: string; name: string; username: string; avatarUrl?: string | null } }[];
};

const STATUS: Record<string, string> = { PLANNING: 'Planning', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
const TYPE: Record<string, string> = { OPEN_SOURCE: 'Open source', HACKATHON: 'Hackathon', LEARNING: 'Learning' };

function LanguageBars({ languages }: { languages: Record<string, number> }) {
  const entries = useMemo(() => Object.entries(languages).sort((a, b) => b[1] - a[1]), [languages]);
  const total = useMemo(() => entries.reduce((s, [, n]) => s + n, 0) || 1, [entries]);
  const colors = ['bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-slate-500'];
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-800">
        {entries.map(([lang, bytes], i) => (
          <div
            key={lang}
            className={`${colors[i % colors.length]} min-w-[2px]`}
            style={{ width: `${(bytes / total) * 100}%` }}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {entries.map(([lang, bytes], i) => (
          <li key={lang} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
            {lang} <span className="text-slate-600">{((bytes / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinRole, setJoinRole] = useState<ProjectTeamRole>('fullstack');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [editVis, setEditVis] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [editSeeking, setEditSeeking] = useState(false);
  const [editRolesNeeded, setEditRolesNeeded] = useState<ProjectTeamRole[]>([]);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    const token = getStoredToken();
    projectsApi
      .getDetail(id, token)
      .then(({ project: data, githubRefreshing }) => {
        if (cancelled) return;
        setProject(data as Project);
        if (githubRefreshing) {
          refetchTimer = setTimeout(() => {
            if (cancelled) return;
            projectsApi.getDetail(id, getStoredToken()).then(({ project: fresh }) => {
              if (!cancelled) setProject(fresh as Project);
            }).catch(() => {});
          }, 4000);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Project not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (refetchTimer) clearTimeout(refetchTimer);
    };
  }, [id]);

  useEffect(() => {
    if (!project) return;
    const v = project.visibility;
    if (v === 'FOLLOWERS_ONLY' || v === 'PRIVATE' || v === 'PUBLIC') setEditVis(v);
    setEditSeeking(!!project.seekingReview);
    setEditRolesNeeded((project.rolesNeeded ?? []).filter((r): r is ProjectTeamRole =>
      PROJECT_TEAM_ROLES.includes(r as ProjectTeamRole),
    ));
  }, [project?.id, project?.visibility, project?.seekingReview, project?.rolesNeeded]);

  useEffect(() => {
    if (!user?.primaryDiscipline) return;
    const map: Record<PrimaryDiscipline, ProjectTeamRole> = {
      DEVELOPER: 'fullstack',
      UI_UX: 'ui_ux',
      GRAPHICS: 'graphics',
      DEVOPS: 'devops',
      PM: 'pm',
    };
    setJoinRole(map[user.primaryDiscipline] ?? 'fullstack');
  }, [user?.primaryDiscipline]);

  async function handleJoin() {
    const token = getStoredToken();
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setJoining(true);
    setError('');
    try {
      await projectsApi.join(token, id, joinRole);
      const updated = await projectsApi.get(id, getStoredToken());
      setProject(updated as Project);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  if (error && !project) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-red-400">{error}</div>;
  if (!project) return null;

  const canJoin = user && !(project.owner.id === user.id || project.members.some((m) => m.user.id === user.id)) && project.status !== 'ARCHIVED';
  const isOwner = user?.id === project.owner.id;

  async function handleProjectLike() {
    const token = getStoredToken();
    if (!token || !id || likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await projectsApi.like(token, id);
      setProject((p) =>
        p ? { ...p, likedByViewer: r.liked, likeCount: r.likeCount, pulseScore: r.pulseScore } : p,
      );
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleOwnerSave() {
    const token = getStoredToken();
    if (!token || !id) return;
    setOwnerSaving(true);
    try {
      await projectsApi.patch(token, id, {
        visibility: editVis,
        seekingReview: editSeeking,
        rolesNeeded: editRolesNeeded,
      });
      const updated = await projectsApi.get(id, token);
      setProject(updated as Project);
    } finally {
      setOwnerSaving(false);
    }
  }
  const gh = project.githubData;
  const repo = gh?.repo;
  const languages = gh?.languages && typeof gh.languages === 'object' ? gh.languages : {};
  const hasLanguages = Object.keys(languages).length > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/projects" className="text-sm text-slate-400 hover:text-brand-400">← Back to projects</Link>
      <div className="card mt-4 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-semibold text-slate-100">{project.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{STATUS[project.status] ?? project.status}</span>
              <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{TYPE[project.type] ?? project.type}</span>
              {repo?.archived && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">Archived on GitHub</span>}
              {project.visibility && project.visibility !== 'PUBLIC' && (
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                  {project.visibility === 'FOLLOWERS_ONLY' ? 'Followers only' : 'Private'}
                </span>
              )}
              {project.seekingReview && (
                <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">Seeking review</span>
              )}
            </div>
            {project.rolesNeeded && project.rolesNeeded.length > 0 && (
              <div className="mt-3">
                <RolesNeededBadges roles={project.rolesNeeded} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <Link to={`/profile/${project.owner.username}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400">
              {project.owner.avatarUrl ? <img src={project.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 text-slate-500">{project.owner.name.charAt(0)}</span>}
              {project.owner.name} (@{project.owner.username})
            </Link>
            <p className="text-xs text-slate-500">Creator</p>
            <FollowCreatorActions username={project.owner.username} userId={project.owner.id} className="justify-end" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-800/80 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <PulseStrip
            pulse={project.pulseScore ?? 0}
            views={project.viewCount ?? 0}
            rep={project.likeCount ?? 0}
            repLabel="★likes"
          />
          {user ? (
            <button
              type="button"
              disabled={likeBusy}
              onClick={handleProjectLike}
              className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition ${
                project.likedByViewer
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : 'border-cyan-500/40 bg-slate-950 text-cyan-400 hover:border-cyan-400/70 hover:bg-cyan-500/10'
              }`}
            >
              {project.likedByViewer ? '> undo prop' : '> ++prop'}
            </button>
          ) : (
            <p className="font-mono text-xs text-slate-500">
              <Link to="/login" className="text-brand-400 hover:underline">login</Link> to drop a ++prop
            </p>
          )}
        </div>

        {project.githubHtmlUrl && project.githubFullName && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href={project.githubHtmlUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
              Open {project.githubFullName} on GitHub ↗
            </a>
            {project.githubSyncedAt && (
              <span className="text-xs text-slate-500">
                GitHub data synced {new Date(project.githubSyncedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <p className="mt-6 whitespace-pre-wrap text-slate-300">{project.description}</p>

        {user && (
          <div className="mt-4">
            <Link
              to={`/community/new?project=${project.id}`}
              className="inline-flex text-sm font-medium text-brand-400 hover:underline"
            >
              Post in community about this project →
            </Link>
          </div>
        )}

        {project.seekingReview && (
          <div className="mt-4 rounded-lg border border-brand-500/35 bg-brand-500/10 px-4 py-3">
            <p className="text-sm text-brand-100">The maintainer is open to review, feedback, or collaboration.</p>
            {!user && (
              <Link to="/login" className="mt-2 inline-block text-sm text-brand-400 hover:underline">Log in to message @{project.owner.username}</Link>
            )}
            {user && user.id !== project.owner.id && (
              <Link to={`/inbox/${project.owner.id}`} className="mt-2 inline-block text-sm font-medium text-brand-400 hover:underline">
                Message @{project.owner.username} directly →
              </Link>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-surface-900/60 p-4">
            <h3 className="font-mono text-sm font-medium text-slate-400">Visibility & review</h3>
            <div className="mt-3 space-y-3">
              <select value={editVis} onChange={(e) => setEditVis(e.target.value as typeof editVis)} className="input w-full max-w-md">
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS_ONLY">Followers only (accepted followers)</option>
                <option value="PRIVATE">Private (you + teammates)</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={editSeeking} onChange={(e) => setEditSeeking(e.target.checked)} />
                Open to review / allow DMs from this page
              </label>
              <div>
                <p className="text-sm text-slate-400">Roles recruiting</p>
                <div className="mt-2">
                  <RolesNeededPicker value={editRolesNeeded} onChange={setEditRolesNeeded} idPrefix="edit" />
                </div>
              </div>
              <button type="button" onClick={handleOwnerSave} className="btn-secondary text-sm" disabled={ownerSaving}>
                {ownerSaving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

        {!project.githubFullName && (
          <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
            This project has no linked GitHub repository (legacy). New projects require a public repo.
          </p>
        )}

        {project.githubFullName && !repo && project.githubHtmlUrl && (
          <p className="mt-6 text-sm text-slate-500">
            Full GitHub metadata could not be loaded.{' '}
            <a href={project.githubHtmlUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
              Open the repository on GitHub
            </a>
            .
          </p>
        )}

        {repo && (
          <div className="mt-8 space-y-8 border-t border-slate-700 pt-8">
            <h2 className="font-mono text-lg font-medium text-slate-200">From GitHub</h2>

            {repo.description && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Repository description</h3>
                <p className="mt-1 text-slate-300">{repo.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Stars', repo.stargazers_count],
                ['Forks', repo.forks_count],
                ['Open issues', repo.open_issues_count],
                ['Watchers', repo.watchers_count ?? repo.subscribers_count],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-lg bg-surface-800/80 px-3 py-2">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-mono text-lg text-slate-100">{val ?? '—'}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {repo.default_branch && (
                <span>Default branch: <code className="text-brand-400">{repo.default_branch}</code></span>
              )}
              {repo.language && <span>Primary language: <span className="text-slate-200">{repo.language}</span></span>}
              {repo.visibility && <span>Visibility: {repo.visibility}</span>}
              {repo.pushed_at && <span>Last push: {new Date(repo.pushed_at).toLocaleDateString()}</span>}
              {repo.size != null && <span>Size: {repo.size} KB (GitHub index)</span>}
            </div>

            {repo.homepage && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Homepage</h3>
                <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-brand-400 hover:underline">
                  {repo.homepage}
                </a>
              </div>
            )}

            {repo.topics && repo.topics.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Topics</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {repo.topics.map((t) => (
                    <span key={t} className="rounded-full bg-surface-800 px-2.5 py-0.5 text-xs text-slate-300">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {repo.license && (repo.license.name || repo.license.spdx_id) && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">License</h3>
                <p className="mt-1 text-slate-300">{repo.license.name} {repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? `(${repo.license.spdx_id})` : ''}</p>
              </div>
            )}

            {repo.owner?.login && (
              <div className="flex items-center gap-3">
                {repo.owner.avatar_url && (
                  <img src={repo.owner.avatar_url} alt="" className="h-10 w-10 rounded-full border border-slate-600" />
                )}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner on GitHub</h3>
                  {repo.owner.html_url ? (
                    <a href={repo.owner.html_url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                      @{repo.owner.login}
                    </a>
                  ) : (
                    <span className="text-slate-300">@{repo.owner.login}</span>
                  )}
                </div>
              </div>
            )}

            {hasLanguages && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Languages</h3>
                <div className="mt-3">
                  <LanguageBars languages={languages} />
                </div>
              </div>
            )}

            {gh?.contributors && gh.contributors.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Contributors</h3>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {gh.contributors.map((c) => (
                    <li key={c.login}>
                      {c.html_url ? (
                        <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-400">
                          {c.avatar_url && <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full" />}
                          <span>@{c.login}</span>
                          {c.contributions != null && <span className="text-xs text-slate-500">({c.contributions})</span>}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">@{c.login}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gh?.readme && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">README</h3>
                <div className="mt-2 max-h-[min(70vh,32rem)] overflow-auto rounded-lg border border-slate-700 bg-surface-950 p-4">
                  <ReadmePreview markdown={gh.readme} />
                </div>
              </div>
            )}
          </div>
        )}

        {project.members.length > 0 && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Team on Programmers World</h2>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <span className="rounded bg-brand-500/20 px-2 py-0.5 text-brand-400">owner</span>
                <Link to={`/profile/${project.owner.username}`} className="text-slate-300 hover:text-brand-400">{project.owner.username}</Link>
              </li>
              {project.members.map((m) => (
                <li key={m.user.id} className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-surface-800 px-2 py-0.5 text-slate-400">
                    {PROJECT_ROLE_LABELS[m.role as ProjectTeamRole] ?? m.role}
                  </span>
                  <Link to={`/profile/${m.user.username}`} className="text-slate-300 hover:text-brand-400">{m.user.username}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {canJoin && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Join this project</h2>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={joinRole} onChange={(e) => setJoinRole(e.target.value as ProjectTeamRole)} className="input w-auto">
                {PROJECT_TEAM_ROLES.map((role) => (
                  <option key={role} value={role}>{PROJECT_ROLE_LABELS[role]}</option>
                ))}
              </select>
              <button type="button" onClick={handleJoin} className="btn-primary" disabled={joining}>{joining ? 'Joining…' : 'Join'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
