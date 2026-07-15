import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { authApi } from '@/shared/api';
import { DISCIPLINE_LABELS, parseDisciplineSlug } from '@/shared/constants/disciplines';
import { GoogleSignInButton } from '@/shared/components/GoogleSignInButton';
import { AuthDivider, AuthFieldLabel, AuthShell } from '@/shared/components/AuthShell';
import {
  GENDER_OPTIONS,
  maxDateOfBirthForRegister,
  minDateOfBirthForRegister,
  type Gender,
} from '@/shared/constants/demographics';
import { usePageMeta } from '@/shared/hooks/usePageMeta';

type AccountKind = 'developer' | 'company';
type DisciplineSlug = 'developer' | 'ui_ux' | 'graphics' | 'devops' | 'pm';

const DISCIPLINE_SLUGS: DisciplineSlug[] = ['developer', 'ui_ux', 'graphics', 'devops', 'pm'];

export default function Register() {
  usePageMeta({ title: 'Sign up', path: '/register' });

  const navigate = useNavigate();
  const { login } = useAuth();
  const [accountKind, setAccountKind] = useState<AccountKind>('developer');
  const [discipline, setDiscipline] = useState<DisciplineSlug>('developer');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
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
    if (!dateOfBirth) {
      setError('Please enter your date of birth.');
      return;
    }
    if (!gender) {
      setError('Please select a gender option.');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.register({
        name,
        username: username.toLowerCase(),
        email,
        password,
        dateOfBirth,
        gender,
        agreedToTerms: true,
        accountType: accountKind,
        ...(accountKind === 'developer' ? { primaryDiscipline: discipline } : {}),
        ...(accountKind === 'developer' && discipline === 'developer' && githubUrl.trim()
          ? { githubUrl: githubUrl.trim() }
          : {}),
        ...(accountKind === 'company'
          ? {
              companyWebsite: companyWebsite.trim(),
              ...(companyDescription.trim() ? { companyDescription: companyDescription.trim() } : {}),
            }
          : {}),
      });
      if (result.needsEmailVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(result.email || email)}`, {
          state: {
            registered: true,
            githubNote: result.githubNote,
            message: result.message,
          },
        });
        return;
      }
      if (result.user) {
        login(result.user);
        navigate(accountKind === 'company' ? '/settings#verification' : '/', {
          state: result.githubNote
            ? { banner: result.githubNote }
            : accountKind === 'company'
              ? { banner: 'Company registered — request verification below when ready.' }
              : undefined,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      const data = (err as { errors?: { msg: string }[] })?.errors;
      setError(data?.length ? data.map((e) => e.msg).join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      wide
      title="Create your account"
      subtitle={
        accountKind === 'company'
          ? 'Register your company to post hiring and intern challenges — verified after review.'
          : 'Join as a developer, designer, DevOps engineer, or PM and start collaborating.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <p className="label-system">Sign up</p>
        <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100">Get started</h2>
      </div>

      <div
        className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-slate-800 bg-surface-900/50 p-1"
        role="tablist"
        aria-label="Account type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={accountKind === 'developer'}
          className={`rounded px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition ${
            accountKind === 'developer'
              ? 'bg-brand-500 text-surface-950 shadow-glow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setAccountKind('developer')}
        >
          Developer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={accountKind === 'company'}
          className={`rounded px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition ${
            accountKind === 'company'
              ? 'bg-brand-500 text-surface-950 shadow-glow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setAccountKind('company')}
        >
          Company
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <div>
          <AuthFieldLabel htmlFor="name">{accountKind === 'company' ? 'Company name' : 'Full name'}</AuthFieldLabel>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="username">Username</AuthFieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
              @
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input pl-8"
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div>
          <AuthFieldLabel htmlFor="email">Email</AuthFieldLabel>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="password">Password</AuthFieldLabel>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-12"
              minLength={6}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-slate-500 hover:text-brand-300"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">At least 6 characters.</p>
        </div>

        <div className="rounded-md border border-slate-800/90 bg-surface-900/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">About you</p>
          <p className="mt-1 text-xs text-slate-500">
            Used for age verification and safety. Not shown on your public profile.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <AuthFieldLabel htmlFor="dateOfBirth">Date of birth</AuthFieldLabel>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input w-full"
                min={minDateOfBirthForRegister()}
                max={maxDateOfBirthForRegister()}
                required
              />
              <p className="mt-1 text-xs text-slate-600">Must be 13 or older.</p>
            </div>
            <div>
              <AuthFieldLabel htmlFor="gender">Gender</AuthFieldLabel>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="input w-full"
                required
              >
                <option value="" disabled>
                  Select…
                </option>
                {GENDER_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {accountKind === 'developer' ? (
          <>
            <div>
              <AuthFieldLabel htmlFor="discipline">Primary focus</AuthFieldLabel>
              <select
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as DisciplineSlug)}
                className="input"
              >
                {DISCIPLINE_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {DISCIPLINE_LABELS[parseDisciplineSlug(slug)]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">You can change this later in settings.</p>
            </div>
            {discipline === 'developer' && (
              <div>
                <AuthFieldLabel htmlFor="githubUrl">GitHub (optional)</AuthFieldLabel>
                <input
                  id="githubUrl"
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="input"
                  placeholder="username or https://github.com/you"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <AuthFieldLabel htmlFor="companyWebsite">Company website</AuthFieldLabel>
              <input
                id="companyWebsite"
                type="url"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="input"
                placeholder="https://yourcompany.com"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">Used for verification. Pending until admin review.</p>
            </div>
            <div>
              <AuthFieldLabel htmlFor="companyDescription">About the company (optional)</AuthFieldLabel>
              <textarea
                id="companyDescription"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                className="input min-h-[88px]"
                maxLength={2000}
                placeholder="What you do, hiring focus, intern programs…"
              />
            </div>
          </>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 bg-surface-900/40 px-4 py-3.5 transition hover:border-brand-900/60">
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

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Creating account…' : accountKind === 'company' ? 'Register company' : 'Create account'}
        </button>
      </form>

      {accountKind === 'developer' && (
        <>
          <AuthDivider />
          <GoogleSignInButton from="/" />
        </>
      )}
    </AuthShell>
  );
}
