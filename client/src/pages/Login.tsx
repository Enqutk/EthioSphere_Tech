import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { authApi, type BanInfo } from '@/shared/api/auth';
import { ApiError } from '@/shared/api/http';
import { GoogleSignInButton } from '@/shared/components/GoogleSignInButton';
import { AuthFieldLabel, AuthShell } from '@/shared/components/AuthShell';
import { usePageMeta } from '@/shared/hooks/usePageMeta';

function formatBanDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Login() {
  usePageMeta({ title: 'Sign in', path: '/login' });

  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, ready } = useAuth();
  const locState = location.state as { from?: string; signedOut?: boolean; passwordReset?: boolean } | null;
  const from = locState?.from || '/';
  const signedOut = Boolean(locState?.signedOut);
  const passwordReset = Boolean(locState?.passwordReset);
  const redirectTo = from === '/login' ? '/' : from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealExplanation, setAppealExplanation] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBanInfo(null);
    setAppealSuccess('');
    setLoading(true);
    try {
      const { user: nextUser } = await authApi.login({ email, password });
      login(nextUser);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.body.code === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(String(err.body.email || email))}`, {
          state: { needsVerify: true },
        });
        return;
      }
      if (err instanceof ApiError && err.body.code === 'ACCOUNT_BANNED') {
        setBanInfo({
          error: String(err.body.error),
          code: 'ACCOUNT_BANNED',
          banReason: String(err.body.banReason || ''),
          bannedAt: err.body.bannedAt as string | null | undefined,
          banExpiresAt: err.body.banExpiresAt as string | null | undefined,
          isPermanent: Boolean(err.body.isPermanent),
          canAppeal: Boolean(err.body.canAppeal),
          appealStatus: err.body.appealStatus as string | null | undefined,
        });
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppeal(e: React.FormEvent) {
    e.preventDefault();
    setAppealLoading(true);
    setError('');
    try {
      const res = await authApi.submitBanAppeal({
        email,
        password,
        message: appealMessage.trim(),
        ...(appealExplanation.trim() ? { explanation: appealExplanation.trim() } : {}),
      });
      setAppealSuccess(res.message);
      setShowAppeal(false);
      setBanInfo((prev) => (prev ? { ...prev, canAppeal: false, appealStatus: 'PENDING' } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not submit appeal');
    } finally {
      setAppealLoading(false);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-md px-6 py-16 text-center text-slate-400">Loading…</div>;
  }
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue building projects, challenges, and connections."
      footer={
        <>
          New to Programmers.World?{' '}
          <Link to="/register" className="font-medium text-brand-400 hover:text-brand-300">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <p className="label-system">Sign in</p>
        <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100">Access your account</h2>
      </div>

      {signedOut && (
        <p className="mb-4 rounded-md border border-brand-500/25 bg-brand-500/10 px-3.5 py-2.5 text-sm text-brand-200">
          You&apos;re signed out. Jump back in anytime.
        </p>
      )}
      {passwordReset && (
        <p className="mb-4 rounded-md border border-brand-500/25 bg-brand-500/10 px-3.5 py-2.5 text-sm text-brand-200">
          Password updated. Sign in with your new password.
        </p>
      )}

      {banInfo && (
        <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-mono text-sm font-semibold text-amber-200">Account access restricted</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Your account has been suspended and cannot sign in at this time.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Reason</dt>
                  <dd className="mt-0.5 text-slate-300">{banInfo.banReason}</dd>
                </div>
                {banInfo.bannedAt && (
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Effective</dt>
                    <dd className="mt-0.5 text-slate-400">{formatBanDate(banInfo.bannedAt)}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Duration</dt>
                  <dd className="mt-0.5 text-slate-400">
                    {banInfo.isPermanent
                      ? 'Indefinite — subject to appeal review'
                      : `Temporary — access may resume on ${formatBanDate(banInfo.banExpiresAt)}`}
                  </dd>
                </div>
              </dl>

              {banInfo.appealStatus === 'PENDING' && (
                <p className="mt-4 rounded-md border border-slate-700 bg-surface-900/60 px-3 py-2 text-xs text-slate-400">
                  Your appeal is pending review. We will notify you once a decision is made.
                </p>
              )}

              {appealSuccess && (
                <p className="mt-4 rounded-md border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-200">
                  {appealSuccess}
                </p>
              )}

              {banInfo.canAppeal && !showAppeal && (
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-brand-400 hover:underline"
                  onClick={() => setShowAppeal(true)}
                >
                  Request a review of this decision →
                </button>
              )}

              {showAppeal && (
                <form onSubmit={handleAppeal} className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-500">
                    Submit a formal appeal explaining why the suspension should be lifted.
                  </p>
                  <div>
                    <AuthFieldLabel htmlFor="appealMessage">
                      Appeal statement <span className="text-red-400">*</span>
                    </AuthFieldLabel>
                    <textarea
                      id="appealMessage"
                      value={appealMessage}
                      onChange={(e) => setAppealMessage(e.target.value)}
                      className="input min-h-[100px] text-sm"
                      minLength={20}
                      maxLength={2000}
                      required
                      placeholder="Describe what happened…"
                    />
                  </div>
                  <div>
                    <AuthFieldLabel htmlFor="appealExplanation">Supporting details (optional)</AuthFieldLabel>
                    <textarea
                      id="appealExplanation"
                      value={appealExplanation}
                      onChange={(e) => setAppealExplanation(e.target.value)}
                      className="input min-h-[72px] text-sm"
                      maxLength={2000}
                      placeholder="Additional context for review…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm" disabled={appealLoading}>
                      {appealLoading ? 'Submitting…' : 'Submit appeal'}
                    </button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setShowAppeal(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && !banInfo && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}
        {error && banInfo && showAppeal && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <div>
          <AuthFieldLabel htmlFor="email">Email</AuthFieldLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <AuthFieldLabel
            htmlFor="password"
            hint={
              <Link to="/forgot-password" className="text-xs font-medium text-brand-400 hover:text-brand-300">
                Forgot password?
              </Link>
            }
          >
            Password
          </AuthFieldLabel>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-12"
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
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <GoogleSignInButton from={redirectTo} />
    </AuthShell>
  );
}
