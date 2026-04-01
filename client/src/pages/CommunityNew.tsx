import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postsApi, projectsApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

const SECTIONS = [
  { value: 'GENERAL', label: 'General' }, { value: 'DEBUG_HELP', label: 'Debug help' }, { value: 'PROJECT_FEEDBACK', label: 'Project feedback' },
  { value: 'ANNOUNCEMENTS', label: 'Announcements' }, { value: 'REACT', label: 'React' }, { value: 'NODE', label: 'Node' },
  { value: 'PYTHON', label: 'Python' }, { value: 'OTHER', label: 'Other' },
] as const;

const SECTION_VALUES = new Set(SECTIONS.map((s) => s.value));

type PlaygroundProject = { id: string; title: string; githubFullName?: string | null };

export default function CommunityNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [section, setSection] = useState('GENERAL');
  const [projectId, setProjectId] = useState('');
  const [playgroundProjects, setPlaygroundProjects] = useState<PlaygroundProject[]>([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = searchParams.get('section');
    if (s && SECTION_VALUES.has(s as (typeof SECTIONS)[number]['value'])) setSection(s);
  }, [searchParams]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    projectsApi
      .list(undefined, token)
      .then((data) => setPlaygroundProjects(data as PlaygroundProject[]))
      .catch(() => setPlaygroundProjects([]));
  }, []);

  useEffect(() => {
    const q = searchParams.get('project') || searchParams.get('projectId');
    if (!q || !playgroundProjects.some((p) => p.id === q)) return;
    setProjectId(q);
    const sec = searchParams.get('section');
    if (!sec) setSection('PROJECT_FEEDBACK');
  }, [searchParams, playgroundProjects]);

  if (!user) {
    navigate('/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const post = await postsApi.create(token, {
        title,
        body,
        section,
        ...(projectId ? { projectId } : {}),
        ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      });
      navigate(`/community/${(post as { id: string }).id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link to="/community" className="text-sm text-slate-400 hover:text-brand-400">← Back to community</Link>
      <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">New post</h1>
      <p className="mt-2 text-slate-400">Start a discussion, ask for collab, or tie the thread to a Playground project.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1" placeholder="What's your question or topic?" required />
        </div>
        <div>
          <label htmlFor="section" className="block text-sm font-medium text-slate-300">Section</label>
          <select id="section" value={section} onChange={(e) => setSection(e.target.value)} className="input mt-1">
            {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-slate-300">Body</label>
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="input mt-1 min-h-[160px] resize-y" placeholder="Describe your question or topic…" required />
        </div>
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-slate-300">
            Playground project <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select
            id="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="input mt-1"
          >
            <option value="">None</option>
            {playgroundProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.githubFullName ? ` · ${p.githubFullName}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Only projects you can open in Playground can be linked.</p>
        </div>
        <div>
          <label htmlFor="repoUrl" className="block text-sm font-medium text-slate-300">Public GitHub repo <span className="font-normal text-slate-500">(optional)</span></label>
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="input mt-1"
            placeholder="https://github.com/you/your-project"
          />
          <p className="mt-1 text-xs text-slate-500">
            Only <strong className="text-slate-400">public</strong> repositories are shown. Private or missing repos are rejected.
          </p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Posting…' : 'Post'}</button>
      </form>
    </div>
  );
}
