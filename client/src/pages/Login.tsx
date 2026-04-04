import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { authApi } from '@/shared/api';

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user: nextUser, token } = await authApi.login({ email, password });
      login(nextUser, token);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
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
      <div className="rounded-2xl border border-slate-800 bg-surface-900/40 p-8 shadow-xl shadow-black/20">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-400">Programmers World</p>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-2 text-slate-400">
          Sign in to keep building—projects, challenges, and community are all here when you are.
        </p>
        {signedOut && (
          <p className="mt-4 rounded-lg border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
            You&apos;re signed out. Jump back in anytime.
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
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
