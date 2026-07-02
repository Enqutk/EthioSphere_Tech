import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { followApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';

export function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout, ready } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [followRequestCount, setFollowRequestCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setFollowRequestCount(0);
      return;
    }
    let cancelled = false;
    followApi
      .incoming()
      .then((rows) => {
        if (!cancelled) setFollowRequestCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setFollowRequestCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (!window.confirm('Sign out of your account? You can log back in anytime.')) return;
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true, state: { signedOut: true } });
  }

  const inboxLabel = followRequestCount > 0 ? `Inbox (${followRequestCount})` : 'Inbox';

  const linkClass = (active: boolean, block = false) =>
    `rounded-md font-mono text-xs font-medium uppercase tracking-wide transition ${
      block ? 'block w-full px-4 py-3 text-left' : 'px-3 py-2'
    } ${
      active
        ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]'
        : 'text-slate-300 hover:bg-surface-800 hover:text-brand-300'
    }`;

  const navItems = [
    { href: '/projects', label: 'Projects' },
    { href: '/buddies', label: 'Buddies' },
    { href: '/challenges', label: 'Challenges' },
    { href: '/community', label: 'Community' },
  ] as const;

  const mobileDrawer =
    menuOpen &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200] bg-black/75 md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <nav
          id="mobile-nav"
          className="fixed inset-y-0 right-0 z-[210] flex w-[min(100vw,20rem)] flex-col border-l border-brand-900/50 bg-surface-900 shadow-2xl md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex h-[3.25rem] shrink-0 items-center justify-between border-b border-slate-800 px-4">
            <span className="font-mono text-xs uppercase tracking-wide text-slate-400">Menu</span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-brand-500/40 hover:text-brand-400"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link to={href} className={linkClass(pathname === href, true)} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {ready && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                {user ? (
                  <div className="space-y-1">
                    <Link
                      to="/inbox"
                      className={linkClass(pathname.startsWith('/inbox'), true)}
                      onClick={() => setMenuOpen(false)}
                    >
                      {inboxLabel}
                    </Link>
                    <Link
                      to="/settings"
                      className={linkClass(pathname === '/settings', true)}
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    {user.isAdmin && (
                      <Link
                        to="/admin"
                        className={linkClass(pathname === '/admin', true)}
                        onClick={() => setMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      to={`/profile/${user.username.toLowerCase()}`}
                      className="block rounded-md px-4 py-3 font-mono text-xs text-slate-400 hover:bg-surface-800 hover:text-brand-300"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile · @{user.username}
                    </Link>
                    <button type="button" onClick={handleLogout} className="btn-secondary mt-2 w-full py-2.5 text-xs">
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      className="block rounded-md px-4 py-3 text-center font-mono text-xs uppercase tracking-wide text-slate-300 hover:bg-surface-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="btn-primary w-full py-2.5 text-center text-xs"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </>,
      document.body,
    );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-brand-900/40 bg-surface-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-[3.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-2 font-mono" onClick={() => setMenuOpen(false)}>
            <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md" width={28} height={28} />
            <span className="flex items-baseline gap-1">
              <span className="text-sm font-bold tracking-tight text-slate-100">
                Programmers<span className="text-brand-400">.</span>World
              </span>
              <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-brand-500/50 animate-cursor-blink max-sm:hidden" aria-hidden />
            </span>
          </Link>

          <nav className="hidden items-center justify-end gap-0.5 md:flex md:gap-1" aria-label="Main">
            {navItems.map(({ href, label }) => (
              <Link key={href} to={href} className={linkClass(pathname === href)}>
                {label}
              </Link>
            ))}
            {ready &&
              (user ? (
                <>
                  <Link to="/inbox" className={linkClass(pathname.startsWith('/inbox'))}>
                    {inboxLabel}
                  </Link>
                  <Link to="/settings" className={linkClass(pathname === '/settings')}>
                    Settings
                  </Link>
                  {user.isAdmin ? (
                    <Link to="/admin" className={linkClass(pathname === '/admin')}>
                      Admin
                    </Link>
                  ) : null}
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
              ))}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-600 bg-surface-900 text-slate-100 hover:border-brand-500/50 hover:text-brand-400 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
