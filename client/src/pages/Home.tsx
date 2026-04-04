import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';

export default function Home() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const banner = (location.state as { banner?: string } | null)?.banner;
  const profileHref = user ? `/profile/${user.username.toLowerCase()}` : '/register';

  const featureCards = [
    {
      title: 'Developer profiles',
      desc: user ? 'View and edit your public profile' : 'Showcase skills, projects & rank',
      href: profileHref,
      icon: '👤',
    },
    { title: 'Project playground', desc: 'Join or start real-world projects', href: '/projects', icon: '🛠️' },
    { title: 'Coding challenges', desc: 'Earn points and climb the board', href: '/challenges', icon: '⚡' },
    { title: 'Community', desc: 'Discuss, debug, get feedback', href: '/community', icon: '💬' },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]" />
      {banner && (
        <div className="relative border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          <span>{banner}</span>
          <button
            type="button"
            className="ml-3 text-amber-300 underline hover:text-amber-100"
            onClick={() => navigate('/', { replace: true, state: {} })}
          >
            Dismiss
          </button>
        </div>
      )}
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 md:text-6xl">
          <span className="text-brand-400">Programmers</span> World
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          {user
            ? `Welcome back, ${user.name}. Build, compete, and connect with other developers.`
            : 'Learn by building. Compete healthily. Get recognized. One place for developers to grow together.'}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {ready && user ? (
            <Link to={profileHref} className="btn-primary">Your profile</Link>
          ) : ready ? (
            <Link to="/register" className="btn-primary">Get started</Link>
          ) : (
            <span className="btn-primary pointer-events-none opacity-50">Loading…</span>
          )}
          <Link to="/projects" className="btn-secondary">Browse projects</Link>
          <Link to="/challenges" className="btn-secondary">Challenges</Link>
        </div>
      </section>
      <section className="relative border-t border-slate-800 bg-surface-900/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-2xl font-semibold text-slate-200 md:text-3xl">What you can do</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((item) => (
              <Link key={item.title} to={item.href} className="card p-6 text-left transition hover:border-brand-500/50 hover:bg-surface-800/50">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 font-mono font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        Built by programmers, for programmers.
      </footer>
    </div>
  );
}
