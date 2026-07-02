import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { RolesNeededPicker } from '@/shared/components/RolesNeededPicker';
import type { ProjectTeamRole } from '@/shared/constants/disciplines';

export default function ProjectNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'LEARNING' | 'OPEN_SOURCE' | 'HACKATHON'>('LEARNING');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [seekingReview, setSeekingReview] = useState(false);
  const [rolesNeeded, setRolesNeeded] = useState<ProjectTeamRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const project = await projectsApi.create({
        githubRepoUrl: githubRepoUrl.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        type,
        visibility,
        seekingReview,
        ...(rolesNeeded.length ? { rolesNeeded } : {}),
      });
      navigate(`/projects/${(project as { id: string }).id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link to="/projects" className="text-sm text-slate-400 hover:text-brand-400">← Back to projects</Link>
      <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">New project</h1>
      <p className="mt-2 text-slate-400">
        Every project must link a <strong className="text-slate-300">public</strong> GitHub repository. We pull the README, languages, stars, and more from GitHub.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label htmlFor="githubRepoUrl" className="block text-sm font-medium text-slate-300">GitHub repository URL</label>
          <input
            id="githubRepoUrl"
            type="url"
            value={githubRepoUrl}
            onChange={(e) => setGithubRepoUrl(e.target.value)}
            className="input mt-1"
            placeholder="https://github.com/you/your-repo"
            required
          />
          <p className="mt-1 text-xs text-slate-500">Private repos cannot be verified — use a public repository.</p>
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title <span className="font-normal text-slate-500">(optional)</span></label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1"
            placeholder="Defaults to the GitHub repository name"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300">Short description <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input mt-1 min-h-[100px] resize-y"
            placeholder="Defaults to the GitHub repo description"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-300">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as 'LEARNING' | 'OPEN_SOURCE' | 'HACKATHON')} className="input mt-1">
            <option value="LEARNING">Learning</option>
            <option value="OPEN_SOURCE">Open source</option>
            <option value="HACKATHON">Hackathon</option>
          </select>
        </div>
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-slate-300">Visibility</label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE')}
            className="input mt-1"
          >
            <option value="PUBLIC">Public — anyone can find and open</option>
            <option value="FOLLOWERS_ONLY">Followers only — accepted followers of you</option>
            <option value="PRIVATE">Private — only you and teammates</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={seekingReview} onChange={(e) => setSeekingReview(e.target.checked)} className="mt-1" />
          <span>
            <span className="font-medium text-slate-200">Open to review / feedback</span>
            <span className="mt-0.5 block text-xs text-slate-500">Shows a badge so others can message you from the project page.</span>
          </span>
        </label>
        <div>
          <p className="block text-sm font-medium text-slate-300">Roles needed on the team</p>
          <p className="mt-1 text-xs text-slate-500">Optional — let designers, DevOps, or PMs know you&apos;re recruiting.</p>
          <div className="mt-3">
            <RolesNeededPicker value={rolesNeeded} onChange={setRolesNeeded} idPrefix="new" />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creating…' : 'Create project'}</button>
      </form>
    </div>
  );
}
