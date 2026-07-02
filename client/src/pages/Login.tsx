import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { authApi, type BanInfo } from '@/shared/api/auth';
import { ApiError } from '@/shared/api/http';
import { GoogleSignInButton } from '@/shared/components/GoogleSignInButton';

function formatBanDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, ready } = useAuth();
  const locState = location.state as { from?: string; signedOut?: boolean } | null;
  const from = locState?.from || '/';
  const signedOut = Boolean(locState?.signedOut);
  const redirectTo = from === '/login' ? '/' : from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <p className="label-system">Auth · session</p>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-2 text-slate-400">
          Sign in to keep building—projects, challenges, and community are all here when you are.
        </p>
        {signedOut && (
          <p className="mt-4 rounded-lg border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
            You&apos;re signed out. Jump back in anytime.
          </p>
        )}

        {banInfo && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-mono text-sm font-semibold text-amber-200">Account access restricted</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Your account has been suspended and cannot sign in at this time. This action was taken to protect our
                  community and maintain platform integrity.
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
                    <dd className="mt-0.5 text-slate-300">{banInfo.banReason}</dd>
                  </div>
                  {banInfo.bannedAt && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Effective</dt>
                      <dd className="mt-0.5 text-slate-400">{formatBanDate(banInfo.bannedAt)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Duration</dt>
                    <dd className="mt-0.5 text-slate-400">
                      {banInfo.isPermanent
                        ? 'Indefinite — subject to appeal review'
                        : `Temporary — access may resume on ${formatBanDate(banInfo.banExpiresAt)}`}
                    </dd>
                  </div>
                </dl>

                {banInfo.appealStatus === 'PENDING' && (
                  <p className="mt-4 rounded-lg border border-slate-700 bg-surface-900/60 px-3 py-2 text-xs text-slate-400">
                    Your appeal is pending review. We will notify you at the email on file once a decision is made.
                  </p>
                )}

                {appealSuccess && (
                  <p className="mt-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-200">
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
                      Submit a formal appeal. Explain why you believe the suspension should be lifted. You may include
                      supporting context (e.g. ID verification details, links, or additional explanation).
                    </p>
                    <div>
                      <label htmlFor="appealMessage" className="block text-xs font-medium text-slate-400">
                        Appeal statement <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="appealMessage"
                        value={appealMessage}
                        onChange={(e) => setAppealMessage(e.target.value)}
                        className="input mt-1 min-h-[100px] text-sm"
                        minLength={20}
                        maxLength={2000}
                        required
                        placeholder="Describe what happened and why you believe this suspension should be reviewed…"
                      />
                    </div>
                    <div>
                      <label htmlFor="appealExplanation" className="block text-xs font-medium text-slate-400">
                        Supporting details <span className="font-normal text-slate-600">(optional)</span>
                      </label>
                      <textarea
                        id="appealExplanation"
                        value={appealExplanation}
                        onChange={(e) => setAppealExplanation(e.target.value)}
                        className="input mt-1 min-h-[72px] text-sm"
                        maxLength={2000}
                        placeholder="Government ID reference, account ownership proof, or other context for our review team…"
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && !banInfo && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          {error && banInfo && showAppeal && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

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
            <GoogleSignInButton from={redirectTo} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-medium text-brand-400 hover:underline">
            Create an account
          </Link>{' '}
          and get started.
        </p>
      </div>
    </div>
  );
}
