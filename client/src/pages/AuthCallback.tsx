import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, mapSessionUser } from '@/shared/components/AuthProvider';
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

    const redirect = searchParams.get('redirect') || '/';
    const dest = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';

    usersApi
      .me()
      .then((profile) => {
        login(mapSessionUser(profile));
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
