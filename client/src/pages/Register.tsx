import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { authApi } from '@/shared/api';
import { DISCIPLINE_LABELS, parseDisciplineSlug } from '@/shared/constants/disciplines';
import { GoogleSignInButton } from '@/shared/components/GoogleSignInButton';

type AccountKind = 'developer' | 'company';
type DisciplineSlug = 'developer' | 'ui_ux' | 'graphics' | 'devops' | 'pm';

const DISCIPLINE_SLUGS: DisciplineSlug[] = ['developer', 'ui_ux', 'graphics', 'devops', 'pm'];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [accountKind, setAccountKind] = useState<AccountKind>('developer');
  const [discipline, setDiscipline] = useState<DisciplineSlug>('developer');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreedToTerms) {
      setError('Please accept the Privacy Policy and Terms of Service to continue.');
      return;
    }
    setLoading(true);
    try {
      const { user, token, githubNote } = await authApi.register({
        name,
        username: username.toLowerCase(),
        email,
        password,
        agreedToTerms: true,
        accountType: accountKind,
        ...(accountKind === 'developer' ? { primaryDiscipline: discipline } : {}),
        ...(accountKind === 'developer' && discipline === 'developer' && githubUrl.trim() ? { githubUrl: githubUrl.trim() } : {}),
        ...(accountKind === 'company'
          ? {
              companyWebsite: companyWebsite.trim(),
              ...(companyDescription.trim() ? { companyDescription: companyDescription.trim() } : {}),
            }
          : {}),
      });
      login(user, token);
      navigate('/', {
        state: githubNote
          ? { banner: githubNote }
          : accountKind === 'company'
            ? { banner: 'Company registered. Apply for verification in Settings when you are ready.' }
            : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      const data = (err as { errors?: { msg: string }[] })?.errors;
      setError(data?.length ? data.map((e) => e.msg).join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <p className="label-system">Auth · register</p>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">Create account</h1>
        <p className="mt-2 text-slate-400">
          {accountKind === 'company'
            ? 'Register your company to post hiring & intern challenges (verified after review).'
            : 'Developers, designers, DevOps, and PMs — build profiles, join projects, and collaborate.'}
        </p>

        <div className="mt-6 flex rounded-lg border border-slate-700 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm ${accountKind === 'developer' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            onClick={() => setAccountKind('developer')}
          >
            Developer
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm ${accountKind === 'company' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            onClick={() => setAccountKind('company')}
          >
            Company
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              {accountKind === 'company' ? 'Company name' : 'Name'}
            </label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" required />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">Username</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input mt-1" pattern="[a-zA-Z0-9_]+" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" minLength={6} required />
          </div>

          {accountKind === 'developer' ? (
            <>
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-slate-300">Primary focus</label>
                <select
                  id="discipline"
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as DisciplineSlug)}
                  className="input mt-1"
                >
                  {DISCIPLINE_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {DISCIPLINE_LABELS[parseDisciplineSlug(slug)]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">You can change this later in profile settings.</p>
              </div>
              {discipline === 'developer' && (
                <div>
                  <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300">
                    GitHub <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input id="githubUrl" type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="input mt-1" placeholder="username or https://github.com/yourname" />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label htmlFor="companyWebsite" className="block text-sm font-medium text-slate-300">Company website</label>
                <input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="input mt-1"
                  placeholder="https://yourcompany.com"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Used to verify your company is real. Status: pending until admin review.</p>
              </div>
              <div>
                <label htmlFor="companyDescription" className="block text-sm font-medium text-slate-300">
                  About the company <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="companyDescription"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  className="input mt-1 min-h-[88px]"
                  maxLength={2000}
                  placeholder="What you do, hiring focus, intern programs…"
                />
              </div>
            </>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-surface-900/40 px-4 py-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-surface-900 text-brand-600 focus:ring-brand-500"
              required
            />
            <span className="text-sm leading-relaxed text-slate-400">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-brand-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" className="text-brand-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : accountKind === 'company' ? 'Register company' : 'Sign up'}
          </button>
        </form>

        {accountKind === 'developer' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-900 px-2 text-slate-500">or</span>
              </div>
            </div>
            <div className="mt-4">
              <GoogleSignInButton from="/" />
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
