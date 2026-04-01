import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { projectsApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  owner: { id: string; name: string; username: string; avatarUrl?: string | null; rank: string };
  members: { role: string; user: { id: string; name: string; username: string; avatarUrl?: string | null } }[];
};

const STATUS: Record<string, string> = { PLANNING: 'Planning', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
const TYPE: Record<string, string> = { OPEN_SOURCE: 'Open source', HACKATHON: 'Hackathon', LEARNING: 'Learning' };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinRole, setJoinRole] = useState('fullstack');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    projectsApi.get(id).then((data) => setProject(data as Project)).catch(() => setError('Project not found')).finally(() => setLoading(false));
  }, [id]);

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
            </div>
          </div>
          <Link to={`/profile/${project.owner.username}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400">
            {project.owner.avatarUrl ? <img src={project.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 text-slate-500">{project.owner.name.charAt(0)}</span>}
            {project.owner.name} (@{project.owner.username})
          </Link>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-slate-300">{project.description}</p>
        {project.members.length > 0 && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Team</h2>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <span className="rounded bg-brand-500/20 px-2 py-0.5 text-brand-400">owner</span>
                <Link to={`/profile/${project.owner.username}`} className="text-slate-300 hover:text-brand-400">{project.owner.username}</Link>
              </li>
              {project.members.map((m) => (
                <li key={m.user.id} className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-surface-800 px-2 py-0.5 text-slate-400">{m.role}</span>
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
              <select value={joinRole} onChange={(e) => setJoinRole(e.target.value)} className="input w-auto">
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="ui_ux">UI/UX</option>
                <option value="fullstack">Fullstack</option>
              </select>
              <button onClick={handleJoin} className="btn-primary" disabled={joining}>{joining ? 'Joining…' : 'Join'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
