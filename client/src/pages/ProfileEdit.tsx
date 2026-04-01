import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { usersApi } from '@/lib/api';
import { getStoredToken } from '@/components/AuthProvider';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const token = getStoredToken();
    if (!token) return;
    usersApi.me(token).then((data) => {
      const d = data as { name?: string; bio?: string; githubUrl?: string; skills?: string[] };
      setName(d.name ?? '');
      setBio(d.bio ?? '');
      setGithubUrl(d.githubUrl ?? '');
      setSkills(Array.isArray(d.skills) ? d.skills.join(', ') : '');
    }).finally(() => setLoading(false));
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await usersApi.updateMe(token, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      navigate(`/profile/${user?.username}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return <div className="mx-auto max-w-xl px-6 py-16 text-center text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link to={`/profile/${user.username}`} className="text-sm text-slate-400 hover:text-brand-400">← Back to profile</Link>
      <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">Edit profile</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" required />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-slate-300">Bio</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="input mt-1 min-h-[80px] resize-y" />
        </div>
        <div>
          <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300">GitHub URL</label>
          <input id="githubUrl" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="input mt-1" placeholder="https://github.com/username" />
        </div>
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-slate-300">Skills (comma-separated)</label>
          <input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} className="input mt-1" placeholder="React, Node.js, TypeScript" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}
