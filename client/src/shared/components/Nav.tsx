import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';

export function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout, ready } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true, state: { signedOut: true } });
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        to={href}
        className={`rounded-md px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide transition ${
          active
            ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]'
            : 'text-slate-400 hover:bg-surface-800/80 hover:text-brand-300'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-brand-900/40 bg-surface-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-[3.25rem] max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-2 font-mono">
          <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md" width={28} height={28} />
          <span className="flex items-baseline gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500/80">pw</span>
            <span className="text-sm font-bold tracking-tight text-slate-100">
              Programmers<span className="text-brand-400">.</span>World
            </span>
            <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-brand-500/50 animate-cursor-blink" aria-hidden />
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          {navLink('/projects', 'Projects')}
          {navLink('/buddies', 'Buddies')}
          {navLink('/challenges', 'Challenges')}
          {navLink('/community', 'Community')}
          {ready && (
            user ? (
              <>
                {navLink('/inbox', 'Inbox')}
                {user.isAdmin ? navLink('/admin', 'Admin') : null}
                <Link
                  to={`/profile/${user.username.toLowerCase()}`}
                  className="ml-1 max-w-[10rem] truncate rounded-md px-2 py-2 font-mono text-xs text-slate-400 hover:text-brand-300"
                  title={user.name}
                >
                  @{user.username}
                </Link>
                <button type="button" onClick={handleLogout} className="btn-secondary ml-1 py-1.5 text-xs">
                  Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-brand-300"
                >
                  Log in
                </Link>
                <Link to="/register" className="btn-primary ml-1 py-1.5 text-xs">
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
