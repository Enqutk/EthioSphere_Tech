import type { ReactNode } from 'react';
import { TerminalBackdrop } from '@/shared/components/TerminalBackdrop';

/** Global shell: matrix-style backdrop + grid overlay + content layer. */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-surface-950 font-sans text-slate-100">
      <TerminalBackdrop />
      {/* Subtle grid + vignette — keeps the “IDE / terminal” feel without clutter */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_85%_65%_at_50%_0%,rgba(34,197,94,0.07),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
