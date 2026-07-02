import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { usersApi } from '@/shared/api';
import {
  DISCIPLINE_LABELS,
  DISCIPLINE_SKILL_HINTS,
  PRIMARY_DISCIPLINES,
  type PrimaryDiscipline,
  type DesignLinks,
} from '@/shared/constants/disciplines';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, ready, updateSessionUser } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [primaryDiscipline, setPrimaryDiscipline] = useState<PrimaryDiscipline>('DEVELOPER');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [behanceUrl, setBehanceUrl] = useState('');
  const [dribbbleUrl, setDribbbleUrl] = useState('');
  const [skills, setSkills] = useState('');
  const [profileSections, setProfileSections] = useState<{ title: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDesigner = primaryDiscipline === 'UI_UX' || primaryDiscipline === 'GRAPHICS';

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login', { state: { from: '/profile/edit' } });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    usersApi
      .me()
      .then((data) => {
        const d = data as {
          name?: string;
          bio?: string;
          primaryDiscipline?: PrimaryDiscipline;
          githubUrl?: string;
          portfolioUrl?: string;
          designLinks?: DesignLinks | null;
          skills?: string[];
          profileSections?: { title?: string; content?: string }[];
        };
        setName(d.name ?? '');
        setBio(d.bio ?? '');
        setPrimaryDiscipline(d.primaryDiscipline ?? 'DEVELOPER');
        setGithubUrl(d.githubUrl ?? '');
        setPortfolioUrl(d.portfolioUrl ?? '');
        const links = d.designLinks ?? {};
        setFigmaUrl(links.figma ?? '');
        setBehanceUrl(links.behance ?? '');
        setDribbbleUrl(links.dribbble ?? '');
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
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const designLinks: DesignLinks = {};
      if (figmaUrl.trim()) designLinks.figma = figmaUrl.trim();
      if (behanceUrl.trim()) designLinks.behance = behanceUrl.trim();
      if (dribbbleUrl.trim()) designLinks.dribbble = dribbbleUrl.trim();

      const updated = await usersApi.updateMe({
        name: name.trim(),
        bio: bio.trim() || undefined,
        primaryDiscipline,
        githubUrl: githubUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() ? portfolioUrl.trim() : null,
        designLinks,
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

  if (user.accountType === 'COMPANY') {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link to={`/profile/${user.username}`} className="text-sm text-slate-400 hover:text-brand-400">← Back to profile</Link>
        <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">Edit profile</h1>
        <p className="mt-3 text-sm text-slate-400">
          Company accounts use Settings for brand details, social channels, and verification.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/settings#social" className="btn-primary text-xs">Brand & social links</Link>
          <Link to="/settings#verification" className="btn-secondary text-xs">Verification</Link>
        </div>
      </div>
    );
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
          <label htmlFor="discipline" className="block text-sm font-medium text-slate-300">Primary focus</label>
          <select
            id="discipline"
            value={primaryDiscipline}
            onChange={(e) => setPrimaryDiscipline(e.target.value as PrimaryDiscipline)}
            className="input mt-1"
          >
            {PRIMARY_DISCIPLINES.map((d) => (
              <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-slate-300">Bio</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="input mt-1 min-h-[80px] resize-y" />
        </div>
        {(primaryDiscipline === 'DEVELOPER' || primaryDiscipline === 'DEVOPS') && (
          <div>
            <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300">GitHub URL</label>
            <input id="githubUrl" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="input mt-1" placeholder="https://github.com/username" />
          </div>
        )}
        <div>
          <label htmlFor="portfolioUrl" className="block text-sm font-medium text-slate-300">
            {isDesigner ? 'Portfolio URL' : 'Hosted portfolio URL'}
          </label>
          <input
            id="portfolioUrl"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="input mt-1"
            placeholder={isDesigner ? 'https://yourportfolio.com' : 'https://you.github.io / https://your-site.vercel.app'}
          />
        </div>
        {isDesigner && (
          <div className="space-y-3 rounded-lg border border-slate-800 bg-surface-900/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Design profiles</p>
            <div>
              <label htmlFor="figmaUrl" className="block text-sm text-slate-400">Figma community / file link</label>
              <input id="figmaUrl" type="url" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} className="input mt-1" placeholder="https://figma.com/…" />
            </div>
            <div>
              <label htmlFor="behanceUrl" className="block text-sm text-slate-400">Behance</label>
              <input id="behanceUrl" type="url" value={behanceUrl} onChange={(e) => setBehanceUrl(e.target.value)} className="input mt-1" placeholder="https://behance.net/…" />
            </div>
            <div>
              <label htmlFor="dribbbleUrl" className="block text-sm text-slate-400">Dribbble</label>
              <input id="dribbbleUrl" type="url" value={dribbbleUrl} onChange={(e) => setDribbbleUrl(e.target.value)} className="input mt-1" placeholder="https://dribbble.com/…" />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-slate-300">Skills (comma-separated)</label>
          <input
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="input mt-1"
            placeholder={DISCIPLINE_SKILL_HINTS[primaryDiscipline]}
          />
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
