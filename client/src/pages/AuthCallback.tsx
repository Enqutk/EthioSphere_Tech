import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { usersApi } from '@/shared/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user, ready } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (user) {
      navigate('/', { replace: true });
      return;
    }

    const err = searchParams.get('error');
    if (err) {
      setError(decodeURIComponent(err));
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setError('Missing sign-in token. Please try again.');
      return;
    }

    const redirect = searchParams.get('redirect') || '/';

    usersApi
      .me(token)
      .then((profile) => {
        const p = profile as {
          id: string;
          email: string;
          username: string;
          name: string;
          rank: string;
          avatarUrl?: string | null;
          githubUrl?: string | null;
          isAdmin?: boolean;
          accountType?: 'DEVELOPER' | 'COMPANY';
          primaryDiscipline?: string;
          company?: unknown;
          hasPassword?: boolean;
          googleLinked?: boolean;
        };
        login(
          {
            id: p.id,
            email: p.email,
            username: p.username,
            name: p.name,
            rank: p.rank,
            avatarUrl: p.avatarUrl,
            githubUrl: p.githubUrl,
            isAdmin: p.isAdmin,
            accountType: p.accountType,
            primaryDiscipline: p.primaryDiscipline as import('@/shared/api/types').PrimaryDiscipline,
            company: p.company as import('@/shared/api/types').User['company'],
          },
          token,
        );
        const dest = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
        navigate(dest, { replace: true });
      })
      .catch(() => setError('Could not complete sign-in. Please try again.'));
  }, [ready, user, searchParams, login, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-mono text-lg text-red-400">Sign-in failed</p>
        <p className="mt-3 text-sm text-slate-400">{error}</p>
        <Link to="/login" className="btn-primary mt-6 inline-block text-xs">
          Back to login
        </Link>
      </div>
    );
  }

  return <div className="mx-auto max-w-md px-6 py-16 text-center text-slate-400">Completing sign-in…</div>;
}
