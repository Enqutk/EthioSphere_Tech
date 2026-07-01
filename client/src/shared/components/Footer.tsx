import { Link } from 'react-router-dom';
import { SITE } from '@/shared/config/site';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-slate-800/80 bg-surface-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="font-mono text-sm font-semibold text-slate-200">{SITE.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{SITE.tagline}</p>
          <a
            href={SITE.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-brand-400 transition hover:text-brand-300"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View source on GitHub
          </a>
        </div>

        <div className="flex flex-wrap gap-10 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Legal</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/privacy" className="text-slate-400 transition hover:text-brand-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 transition hover:text-brand-400">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Community</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/community" className="text-slate-400 transition hover:text-brand-400">
                  Forum
                </Link>
              </li>
              <li>
                <Link to="/challenges" className="text-slate-400 transition hover:text-brand-400">
                  Challenges
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/60 px-6 py-4">
        <p className="mx-auto max-w-6xl text-center text-xs text-slate-600">
          © {year} {SITE.name}. Open source under the repository license.
        </p>
      </div>
    </footer>
  );
}
