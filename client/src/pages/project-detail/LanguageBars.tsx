import { useMemo } from 'react';

export function LanguageBars({ languages }: { languages: Record<string, number> }) {
  const entries = useMemo(() => Object.entries(languages).sort((a, b) => b[1] - a[1]), [languages]);
  const total = useMemo(() => entries.reduce((s, [, n]) => s + n, 0) || 1, [entries]);
  const colors = ['bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-slate-500'];

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-800">
        {entries.map(([lang, bytes], i) => (
          <div
            key={lang}
            className={`${colors[i % colors.length]} min-w-[2px]`}
            style={{ width: `${(bytes / total) * 100}%` }}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {entries.map(([lang, bytes], i) => (
          <li key={lang} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
            {lang} <span className="text-slate-600">{((bytes / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
