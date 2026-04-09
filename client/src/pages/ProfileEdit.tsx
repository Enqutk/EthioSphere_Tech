import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { usersApi } from '@/shared/api';
import { getStoredToken } from '@/shared/components/AuthProvider';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, ready, updateSessionUser } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState('');
  const [profileSections, setProfileSections] = useState<{ title: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login', { state: { from: '/profile/edit' } });
      setLoading(false);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { state: { from: '/profile/edit' } });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    usersApi
      .me(token)
      .then((data) => {
        const d = data as {
          name?: string;
          bio?: string;
          githubUrl?: string;
          portfolioUrl?: string;
          skills?: string[];
          profileSections?: { title?: string; content?: string }[];
        };
        setName(d.name ?? '');
        setBio(d.bio ?? '');
        setGithubUrl(d.githubUrl ?? '');
        setPortfolioUrl(d.portfolioUrl ?? '');
        setSkills(Array.isArray(d.skills) ? d.skills.join(', ') : '');
        setProfileSections(
          Array.isArray(d.profileSections)
            ? d.profileSections
                .map((s) => ({
                  title: (s?.title ?? '').trim(),
                  content: (s?.content ?? '').trim(),
                }))
                .filter((s) => s.title && s.content)
            : [],
        );
      })
      .catch(() => setError('Could not load your profile. Try logging in again.'))
      .finally(() => setLoading(false));
  }, [user, ready, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const updated = await usersApi.updateMe(token, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() ? portfolioUrl.trim() : null,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        profileSections: profileSections
          .map((s) => ({ title: s.title.trim(), content: s.content.trim() }))
          .filter((s) => s.title && s.content),
      });
      updateSessionUser(updated);
      navigate(`/profile/${updated.username}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !user || loading) {
    return <div className="mx-auto max-w-xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  }

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
          <label htmlFor="portfolioUrl" className="block text-sm font-medium text-slate-300">Hosted portfolio URL</label>
          <input
            id="portfolioUrl"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="input mt-1"
            placeholder="https://you.github.io / https://your-site.vercel.app"
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Deploy your own mini-site anywhere (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.) and paste the public{' '}
            <span className="font-mono text-slate-400">https://</span> link. It opens in a new tab from your profile — we don’t host or embed the page.
          </p>
        </div>
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-slate-300">Skills (comma-separated)</label>
          <input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} className="input mt-1" placeholder="React, Node.js, TypeScript" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">Custom sections</label>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setProfileSections((prev) => [...prev, { title: '', content: '' }])}
            >
              Add section
            </button>
          </div>
          {profileSections.length === 0 ? (
            <p className="text-xs text-slate-500">Add sections like Experience, Stack, Journey, or Contact.</p>
          ) : (
            <div className="space-y-3">
              {profileSections.map((section, idx) => (
                <div key={idx} className="rounded-lg border border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      value={section.title}
                      onChange={(e) =>
                        setProfileSections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)),
                        )
                      }
                      className="input"
                      placeholder="Section title"
                      maxLength={80}
                    />
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => setProfileSections((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={section.content}
                    onChange={(e) =>
                      setProfileSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, content: e.target.value } : s)),
                      )
                    }
                    className="input mt-2 min-h-[90px] resize-y"
                    placeholder="Section content"
                    maxLength={4000}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}
