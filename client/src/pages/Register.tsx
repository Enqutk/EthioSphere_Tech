import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { authApi } from '@/lib/api';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token, githubNote } = await authApi.register({
        name,
        username: username.toLowerCase(),
        email,
        password,
        ...(githubUrl.trim() ? { githubUrl: githubUrl.trim() } : {}),
      });
      login(user, token);
      navigate('/', { state: githubNote ? { banner: githubNote } : undefined });
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
      <h1 className="font-mono text-2xl font-semibold text-slate-100">Create account</h1>
      <p className="mt-2 text-slate-400">Join Programmers World and start building.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300">Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="Your name" required />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-300">Username</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input mt-1" placeholder="cool_dev" pattern="[a-zA-Z0-9_]+" required />
          <p className="mt-1 text-xs text-slate-500">Letters, numbers, underscore only.</p>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" placeholder="you@example.com" required />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" placeholder="At least 6 characters" minLength={6} required />
        </div>
        <div>
          <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300">GitHub <span className="font-normal text-slate-500">(optional)</span></label>
          <input
            id="githubUrl"
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="input mt-1"
            placeholder="username or https://github.com/yourname"
          />
          <p className="mt-1 text-xs text-slate-500">
            We use your public GitHub stats (repos, followers, account age) to suggest a starting skill level. You can change your profile later.
          </p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
