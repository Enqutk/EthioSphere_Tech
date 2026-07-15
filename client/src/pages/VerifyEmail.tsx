import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authApi } from '@/shared/api/auth';
import { useAuth } from '@/shared/components/AuthProvider';
import { AuthShell } from '@/shared/components/AuthShell';
import { usePageMeta } from '@/shared/hooks/usePageMeta';

export default function VerifyEmail() {
  usePageMeta({ title: 'Verify email', path: '/verify-email' });

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailFromQuery = searchParams.get('email') || '';
  const { login } = useAuth();
  const locState = location.state as { registered?: boolean; message?: string } | null;

  const [status, setStatus] = useState<'idle' | 'verifying' | 'ok' | 'error'>(
    token ? 'verifying' : 'idle',
  );
  const [message, setMessage] = useState(
    locState?.message ||
      (locState?.registered
        ? 'Account created. Check your inbox for a verification link.'
        : ''),
  );
  const [email, setEmail] = useState(emailFromQuery);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.verifyEmail({ token });
        if (cancelled) return;
        login(res.user);
        setStatus('ok');
        setMessage(res.message || 'Email verified.');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, login, navigate]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    setMessage('');
    try {
      const res = await authApi.resendVerification({ email });
      setMessage(res.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not resend');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="We sent a link to confirm you own this address. Open it to finish signing up."
      footer={
        <>
          Already verified?{' '}
          <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <p className="label-system">Email verification</p>
      <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100">Confirm ownership</h2>

      {status === 'verifying' && (
        <p className="mt-6 text-sm text-slate-400">Verifying your link…</p>
      )}

      {status === 'ok' && (
        <p className="mt-6 rounded-md border border-brand-500/30 bg-brand-500/10 px-3.5 py-2.5 text-sm text-brand-200">
          {message} Redirecting…
        </p>
      )}

      {(status === 'error' || status === 'idle') && (
        <div className="mt-6 space-y-5">
          {status === 'error' && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {message}
            </p>
          )}
          {status === 'idle' && message && (
            <p className="rounded-md border border-brand-500/30 bg-brand-500/10 px-3.5 py-2.5 text-sm text-brand-200">
              {message}
            </p>
          )}
          <p className="text-sm text-slate-400">
            Didn&apos;t get the email? Check spam, or resend a new link.
          </p>
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-slate-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={resendLoading}>
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
