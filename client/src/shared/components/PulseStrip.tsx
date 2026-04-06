type Props = {
  pulse: number;
  views: number;
  rep?: number;
  repLabel?: string;
  className?: string;
};

/** Terminal-style engagement line for dev aesthetic. */
export function PulseStrip({ pulse, views, rep, repLabel = '+rep', className }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider ${className ?? ''}`}
    >
      <span
        className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
        title="Pulse — weighted mix of votes, views, and discussion"
      >
        pulse≈{pulse}
      </span>
      <span
        className="rounded border border-slate-600/90 bg-slate-950/80 px-2 py-1 text-slate-400"
        title="Page views"
      >
        views:{views}
      </span>
      {rep != null && (
        <span
          className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-emerald-400"
          title="Community signal"
        >
          {repLabel}:{rep}
        </span>
      )}
    </div>
  );
}
