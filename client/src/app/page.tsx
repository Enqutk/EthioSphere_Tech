import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]" />
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 md:text-6xl">
          <span className="text-brand-400">Programmers</span> World
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Learn by building. Compete healthily. Get recognized. One place for developers to grow together.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
          <Link href="/projects" className="btn-secondary">
            Browse projects
          </Link>
          <Link href="/challenges" className="btn-secondary">
            Challenges
          </Link>
        </div>
      </section>

      <section className="relative border-t border-slate-800 bg-surface-900/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-2xl font-semibold text-slate-200 md:text-3xl">
            What you can do
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Developer profiles', desc: 'Showcase skills, projects & rank', href: '/register', icon: '👤' },
              { title: 'Project playground', desc: 'Join or start real-world projects', href: '/projects', icon: '🛠️' },
              { title: 'Coding challenges', desc: 'Earn points and climb the board', href: '/challenges', icon: '⚡' },
              { title: 'Community', desc: 'Discuss, debug, get feedback', href: '/community', icon: '💬' },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="card p-6 text-left transition hover:border-brand-500/50 hover:bg-surface-800/50"
              >
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
