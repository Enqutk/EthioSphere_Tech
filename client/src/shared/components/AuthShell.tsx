import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Wider form column for register */
  wide?: boolean;
  footer?: ReactNode;
};

const HIGHLIGHTS = [
  'Ship projects with GitHub-linked portfolios',
  'Join challenges and grow with peers',
  'DM, follow, and collaborate securely',
] as const;

/**
 * Shared sign-in / sign-up chrome: brand panel + focused form.
 * Stays inside Programmers.World surfaces (green / terminal), not a generic SaaS card stack.
 */
export function AuthShell({ title, subtitle, children, wide = false, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,197,94,0.12),transparent_50%),radial-gradient(ellipse_at_90%_80%,rgba(34,197,94,0.06),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col lg:flex-row">
        <aside className="flex flex-col justify-between border-b border-brand-900/40 px-6 py-10 sm:px-10 lg:w-[42%] lg:border-b-0 lg:border-r lg:py-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-mono">
              <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-md" width={32} height={32} />
              <span className="text-base font-bold tracking-tight text-slate-100">
                Programmers<span className="text-brand-400">.</span>World
              </span>
            </Link>
            <p className="mt-8 max-w-sm font-mono text-[10px] uppercase tracking-[0.22em] text-brand-400/90">
              Developer platform
            </p>
            <h1 className="mt-3 max-w-md font-mono text-3xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">{subtitle}</p>
          </div>

          <ul className="mt-10 hidden space-y-3 lg:block">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-brand-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-16">
          <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>
            <div className="rounded-lg border border-brand-900/50 bg-surface-950/80 p-6 shadow-[0_0_0_1px_rgba(34,197,94,0.06)] backdrop-blur-md sm:p-8">
              {children}
            </div>
            {footer ? <div className="mt-6 text-center text-sm text-slate-400">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuthFieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="block font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {children}
      </label>
      {hint}
    </div>
  );
}

export function AuthDivider({ label = 'or continue with' }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-slate-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-surface-950 px-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}
