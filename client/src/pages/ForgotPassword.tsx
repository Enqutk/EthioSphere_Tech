import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setMessage(res.message);
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <p className="label-system">Auth · recovery</p>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">Forgot password</h1>
        <p className="mt-2 text-slate-400">
          Enter the email on your account and we&apos;ll send reset instructions if it exists.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {message && (
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
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
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-brand-400 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
