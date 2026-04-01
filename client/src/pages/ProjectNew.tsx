import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

export default function ProjectNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'LEARNING' | 'OPEN_SOURCE' | 'HACKATHON'>('LEARNING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const project = await projectsApi.create(token, { title, description, type });
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
      <p className="mt-2 text-slate-400">Post a project idea and start building with others.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1" placeholder="My awesome project" required />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="input mt-1 min-h-[120px] resize-y" placeholder="What are you building? What roles do you need?" required />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-300">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as 'LEARNING' | 'OPEN_SOURCE' | 'HACKATHON')} className="input mt-1">
            <option value="LEARNING">Learning</option>
            <option value="OPEN_SOURCE">Open source</option>
            <option value="HACKATHON">Hackathon</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creating…' : 'Create project'}</button>
      </form>
    </div>
  );
}
