import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { projectsApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { usePageMeta } from '@/shared/hooks/usePageMeta';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { PulseStrip } from '@/shared/components/PulseStrip';
import { RolesNeededPicker, RolesNeededBadges } from '@/shared/components/RolesNeededPicker';
import {
  PROJECT_TEAM_ROLES,
  PROJECT_ROLE_LABELS,
  type ProjectTeamRole,
  type PrimaryDiscipline,
} from '@/shared/constants/disciplines';
import { ProjectGithubPanel } from '@/pages/project-detail/ProjectGithubPanel';
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, type ProjectDetailData } from '@/pages/project-detail/types';

type Project = ProjectDetailData;

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
    projectsApi
      .getDetail(id)
      .then(({ project: data, githubRefreshing }) => {
        if (cancelled) return;
        setProject(data as Project);
        if (githubRefreshing) {
          refetchTimer = setTimeout(() => {
            if (cancelled) return;
            projectsApi.getDetail(id).then(({ project: fresh }) => {
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

  usePageMeta({
    title: project?.title,
    description: project?.description?.slice(0, 160),
    path: project ? `/projects/${project.id}` : undefined,
  });

  async function handleJoin() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setJoining(true);
    setError('');
    try {
      await projectsApi.join(id, joinRole);
      const updated = await projectsApi.get(id);
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
    if (!user || !id || likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await projectsApi.like(id);
      setProject((p) =>
        p ? { ...p, likedByViewer: r.liked, likeCount: r.likeCount, pulseScore: r.pulseScore } : p,
      );
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleOwnerSave() {
    if (!user || !id) return;
    setOwnerSaving(true);
    try {
      await projectsApi.patch(id, {
        visibility: editVis,
        seekingReview: editSeeking,
        rolesNeeded: editRolesNeeded,
      });
      const updated = await projectsApi.get(id);
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
              <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{PROJECT_STATUS_LABEL[project.status] ?? project.status}</span>
              <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">{PROJECT_TYPE_LABEL[project.type] ?? project.type}</span>
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

        <ProjectGithubPanel
          githubFullName={project.githubFullName}
          githubHtmlUrl={project.githubHtmlUrl}
          gh={gh}
          repo={repo}
          languages={languages}
          hasLanguages={hasLanguages}
        />

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
