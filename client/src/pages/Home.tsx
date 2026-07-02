import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postsApi, projectsApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { usePageMeta } from '@/shared/hooks/usePageMeta';
import { RolesNeededBadges } from '@/shared/components/RolesNeededPicker';
import { SuggestedPeople } from '@/shared/components/SuggestedPeople';

type Module = {
  code: string;
  title: string;
  oneLiner: string;
  href: string;
  accent: 'green' | 'red';
};

type HomePost = {
  id: string;
  title: string;
  body: string;
  section: string;
  solved: boolean;
  author: { username: string };
  commentCount?: number;
};

type HomeProject = {
  id: string;
  title: string;
  description: string;
  status: string;
  githubFullName?: string | null;
  rolesNeeded?: string[];
  owner: { name: string; username: string };
};

const SECTIONS: Record<string, string> = {
  GENERAL: 'General',
  DEBUG_HELP: 'Debug help',
  PROJECT_FEEDBACK: 'Project feedback',
  ANNOUNCEMENTS: 'Announcements',
  REACT: 'React',
  NODE: 'Node',
  PYTHON: 'Python',
  OTHER: 'Other',
};

const PROJECT_STATUS: Record<string, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const PREVIEW_COUNT = 4;

export default function Home() {
  usePageMeta({ path: '/' });

  const { user, ready } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const banner = (location.state as { banner?: string } | null)?.banner;
  const profileHref = user ? `/profile/${user.username.toLowerCase()}` : '/register';

  const [recentPosts, setRecentPosts] = useState<HomePost[]>([]);
  const [recentProjects, setRecentProjects] = useState<HomeProject[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    Promise.all([
      postsApi.list({ take: PREVIEW_COUNT }),
      projectsApi.list({ take: PREVIEW_COUNT }),
    ])
      .then(([postsPage, projectsPage]) => {
        if (cancelled) return;
        setRecentPosts(postsPage.items as HomePost[]);
        setRecentProjects(projectsPage.items as HomeProject[]);
      })
      .catch(() => {
        if (!cancelled) {
          setRecentPosts([]);
          setRecentProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      oneLiner: 'Find people, follow them, and unlock DMs plus followers-only projects.',
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
              <>
                <Link to={profileHref} className="btn-primary">
                  Open profile
                </Link>
                <Link to="/buddies" className="btn-secondary">
                  Find people to follow
                </Link>
              </>
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

      {user && (
        <section className="relative border-t border-brand-900/40 bg-surface-950/50 py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <SuggestedPeople />
          </div>
        </section>
      )}

      <section className="relative border-t border-brand-900/40 bg-surface-950/60 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-system">Live feed</p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-slate-100 md:text-2xl">From the community</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                A snapshot of what people are building and discussing right now.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link to="/community" className="text-brand-400 hover:underline">
                All posts →
              </Link>
              <Link to="/projects" className="text-brand-400 hover:underline">
                All projects →
              </Link>
            </div>
          </div>

          {feedLoading ? (
            <p className="text-center text-sm text-slate-500">Loading latest activity…</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-mono text-sm font-medium uppercase tracking-wide text-slate-400">Projects</h3>
                  <Link to="/projects/new" className="text-xs text-brand-400 hover:underline">
                    Start one →
                  </Link>
                </div>
                {recentProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                    No public projects yet.{' '}
                    <Link to="/projects/new" className="text-brand-400 hover:underline">
                      Create the first
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentProjects.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/projects/${p.id}`}
                          className="card block p-4 transition hover:border-brand-500/40"
                        >
                          <h4 className="font-mono text-sm font-semibold text-slate-100">{p.title}</h4>
                          {p.githubFullName && (
                            <p className="mt-0.5 font-mono text-[11px] text-brand-400/80">{p.githubFullName}</p>
                          )}
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.description}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded bg-surface-800 px-1.5 py-0.5">
                              {PROJECT_STATUS[p.status] ?? p.status}
                            </span>
                            <span>
                              by @{p.owner.username}
                            </span>
                          </div>
                          {p.rolesNeeded && p.rolesNeeded.length > 0 && (
                            <div className="mt-2">
                              <RolesNeededBadges roles={p.rolesNeeded} />
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-mono text-sm font-medium uppercase tracking-wide text-slate-400">Community</h3>
                  <Link to="/community/new" className="text-xs text-brand-400 hover:underline">
                    New post →
                  </Link>
                </div>
                {recentPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                    No discussions yet.{' '}
                    <Link to="/community/new" className="text-brand-400 hover:underline">
                      Start a thread
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentPosts.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/community/${p.id}`}
                          className="card block p-4 transition hover:border-brand-500/40"
                        >
                          <h4 className="font-mono text-sm font-semibold text-slate-100">{p.title}</h4>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.body}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-brand-400">
                              {SECTIONS[p.section] ?? p.section}
                            </span>
                            <span>@{p.author.username}</span>
                            {p.commentCount != null && p.commentCount > 0 && (
                              <span>{p.commentCount} comment{p.commentCount === 1 ? '' : 's'}</span>
                            )}
                            {p.solved && <span className="text-emerald-400">Solved</span>}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

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
    </div>
  );
}
