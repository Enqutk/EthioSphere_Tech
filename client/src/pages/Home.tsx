import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';

type Module = {
  code: string;
  title: string;
  oneLiner: string;
  href: string;
  accent: 'green' | 'red';
};

export default function Home() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const banner = (location.state as { banner?: string } | null)?.banner;
  const profileHref = user ? `/profile/${user.username.toLowerCase()}` : '/register';

  const modules: Module[] = [
    {
      code: 'IDENT',
      title: 'Developer identity',
      oneLiner: 'Profile, skills, rank, and public projects — your dev résumé on the platform.',
      href: profileHref,
      accent: 'green',
    },
    {
      code: 'BUILD',
      title: 'Project playground',
      oneLiner: 'Link GitHub repos, set visibility, invite roles, ask for review.',
      href: '/projects',
      accent: 'green',
    },
    {
      code: 'COMP',
      title: 'Coding challenges',
      oneLiner: 'Submit solutions (e.g. GitHub). Timed windows and leaderboards when admins enable them.',
      href: '/challenges',
      accent: 'red',
    },
    {
      code: 'NET',
      title: 'Community',
      oneLiner: 'Posts by topic — debug help, feedback, stack channels — comments and “solved”.',
      href: '/community',
      accent: 'green',
    },
    {
      code: 'LINK',
      title: 'Connect',
      oneLiner: 'Find people, follow (request-based), and direct messages.',
      href: '/buddies',
      accent: 'red',
    },
  ];

  return (
    <div className="relative">
      {banner && (
        <div className="relative z-10 border-b border-terminal-red/30 bg-terminal-red/10 px-4 py-3 text-center text-sm text-red-100">
          <span>{banner}</span>
          <button
            type="button"
            className="ml-3 font-mono text-xs uppercase tracking-wide text-red-300 underline hover:text-red-100"
            onClick={() => navigate('/', { replace: true, state: {} })}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero — what this system is in one glance */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-system text-brand-400/80">Developer platform</p>
          <h1 className="mt-4 font-mono text-3xl font-bold leading-tight tracking-tight text-slate-50 md:text-5xl md:leading-tight">
            One console for{' '}
            <span className="text-brand-400">build</span>,{' '}
            <span className="text-brand-300">learn</span>,{' '}
            <span className="text-terminal-red">compete</span>,{' '}
            <span className="text-slate-200">connect</span>.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-slate-400 md:text-lg">
            {user ? (
              <>
                Signed in as <span className="font-mono text-brand-400">@{user.username}</span>. Jump into a module below —
                everything routes from the top bar too.
              </>
            ) : (
              <>
                Not another static portfolio grid: real <strong className="font-medium text-slate-300">projects</strong>,{' '}
                <strong className="font-medium text-slate-300">forum-style help</strong>, optional{' '}
                <strong className="font-medium text-slate-300">challenges</strong>, and{' '}
                <strong className="font-medium text-slate-300">social tools</strong> for devs who actually ship.
              </>
            )}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {ready && user ? (
              <Link to={profileHref} className="btn-primary">
                Open profile
              </Link>
            ) : ready ? (
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
            ) : (
              <span className="btn-primary pointer-events-none opacity-50">Loading…</span>
            )}
            <Link to="/projects" className="btn-secondary">
              Browse projects
            </Link>
            {!user && ready && (
              <Link to="/login" className="font-mono text-sm text-slate-500 hover:text-brand-400">
                Log in →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* System map — scannable modules */}
      <section className="relative border-t border-brand-900/40 bg-surface-950/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-system">System map</p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100 md:text-2xl">What lives here</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Five areas. Same order as the nav where it applies — no hidden features.
              </p>
            </div>
            <p className="font-mono text-[10px] text-slate-600">
              <span className="text-brand-500">■</span> core{' '}
              <span className="text-terminal-red/80">■</span> competitive / social edge
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <li key={m.code}>
                <Link
                  to={m.href}
                  className={`card group block h-full p-5 transition hover:border-brand-500/40 hover:shadow-glow ${
                    m.accent === 'red' ? 'hover:border-terminal-red/25' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-widest ${
                        m.accent === 'red' ? 'text-terminal-red/90' : 'text-brand-500'
                      }`}
                    >
                      [{m.code}]
                    </span>
                    <span className="font-mono text-[10px] text-slate-600 opacity-0 transition group-hover:opacity-100">
                      →
                    </span>
                  </div>
                  <h3 className="mt-3 font-mono text-base font-semibold text-slate-100">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{m.oneLiner}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-brand-900/30 py-10 text-center">
        <p className="font-mono text-xs text-slate-600">
          <span className="text-brand-600/80">$</span> Programmers World — built for developers who learn in public.
        </p>
      </footer>
    </div>
  );
}
