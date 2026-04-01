import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout, ready } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true, state: { signedOut: true } });
  }

  const navLink = (href: string, label: string) => (
    <Link
      to={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        pathname === href ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-surface-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-mono text-lg font-semibold text-slate-100">
          <span className="text-brand-400">Programmers</span> World
        </Link>
        <nav className="flex items-center gap-1">
          {navLink('/projects', 'Projects')}
          {navLink('/buddies', 'Buddies')}
          {navLink('/challenges', 'Challenges')}
          {navLink('/community', 'Community')}
          {ready && (
            user ? (
              <>
                {navLink('/inbox', 'Inbox')}
                {user.isAdmin ? navLink('/admin', 'Admin') : null}
                <Link to={`/profile/${user.username.toLowerCase()}`} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200">
                  {user.name}
                </Link>
                <button type="button" onClick={handleLogout} className="btn-secondary ml-2 text-sm">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary ml-2 text-sm">
                  Sign up
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
