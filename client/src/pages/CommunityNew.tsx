import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postsApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

const SECTIONS = [
  { value: 'GENERAL', label: 'General' }, { value: 'DEBUG_HELP', label: 'Debug help' }, { value: 'PROJECT_FEEDBACK', label: 'Project feedback' },
  { value: 'ANNOUNCEMENTS', label: 'Announcements' }, { value: 'REACT', label: 'React' }, { value: 'NODE', label: 'Node' },
  { value: 'PYTHON', label: 'Python' }, { value: 'OTHER', label: 'Other' },
];

export default function CommunityNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [section, setSection] = useState('GENERAL');
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
      const post = await postsApi.create(token, { title, body, section });
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
      <p className="mt-2 text-slate-400">Start a discussion or ask for help.</p>
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
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Posting…' : 'Post'}</button>
      </form>
    </div>
  );
}
