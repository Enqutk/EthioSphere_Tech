import type { Overview } from './types';

export function AdminOverviewCards({ overview }: { overview: Overview }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Users', overview.users],
        ['Posts', overview.posts],
        ['Challenges', overview.challenges],
        ['Projects', overview.projects],
      ].map(([label, n]) => (
        <div key={label} className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 font-mono text-2xl text-slate-100">{n}</p>
        </div>
      ))}
    </div>
  );
}
