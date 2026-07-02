import { Link } from 'react-router-dom';
import { adminApi } from '@/shared/api';
import type { AdminPost } from './types';
import { SECTION_LABEL } from './types';

type Props = {
  posts: AdminPost[];
  onDeletePost: (id: string) => void;
};

export function AdminPostsSection({ posts, onDeletePost }: Props) {
  return (
    <section className="mt-12">
      <h2 className="font-mono text-lg text-slate-200">Community posts</h2>
      <p className="mt-1 text-xs text-slate-500">Latest 100 posts. Deleting removes comments and votes.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/80">
                <td className="px-4 py-3 max-w-xs truncate">
                  <Link to={`/community/${p.id}`} className="text-brand-400 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs">{SECTION_LABEL[p.section] ?? p.section}</td>
                <td className="px-4 py-3">@{p.author.username}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => onDeletePost(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TrustProps = {
  pendingCompanies: Awaited<ReturnType<typeof adminApi.pendingCompanies>>;
  reports: Awaited<ReturnType<typeof adminApi.reports>>;
  banAppeals: Awaited<ReturnType<typeof adminApi.banAppeals>>;
  onReload: () => Promise<void>;
  onBanUser: (userId: string, username: string) => void;
  onReviewAppeal: (appealId: string, status: 'APPROVED' | 'REJECTED') => void;
};

export function AdminTrustSection({ pendingCompanies, reports, banAppeals, onReload, onBanUser, onReviewAppeal }: TrustProps) {
  return (
    <>
      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Company verification</h2>
        <p className="mt-1 text-xs text-slate-500">Review pending company registrations before they are marked verified.</p>
        {pendingCompanies.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No pending companies.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingCompanies.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-800 p-4 text-sm">
                <p className="font-medium text-slate-200">{c.legalName}</p>
                <p className="text-slate-400">
                  @{c.user.username} · {c.user.email}
                </p>
                <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  {c.website}
                </a>
                {c.description && <p className="mt-2 text-slate-400">{c.description}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {c._count.reports} report(s) · {c._count.reviews} review(s)
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={async () => {
                      await adminApi.verifyCompany(c.id, { status: 'VERIFIED' });
                      await onReload();
                    }}
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={async () => {
                      await adminApi.verifyCompany(c.id, { status: 'REJECTED', note: 'Could not confirm company' });
                      await onReload();
                    }}
                  >
                    Reject
                  </button>
                  <button type="button" className="text-xs text-amber-400 hover:underline" onClick={() => onBanUser(c.user.id, c.user.username)}>
                    Ban
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Spam & abuse reports</h2>
        {reports.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No reports.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-800 p-4 text-sm">
                <p className="text-slate-300">
                  <span className="text-amber-400">{r.reason}</span> · {r.status}
                </p>
                <p className="text-xs text-slate-500">
                  By @{r.reporter.username} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <p className="mt-1">
                  Target:{' '}
                  {r.company ? (
                    <Link to={`/profile/${r.company.user.username}`} className="text-brand-400 hover:underline">
                      {r.company.legalName}
                    </Link>
                  ) : r.targetUser ? (
                    <Link to={`/profile/${r.targetUser.username}`} className="text-brand-400 hover:underline">
                      @{r.targetUser.username}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
                {r.details && <p className="mt-2 text-slate-400">{r.details}</p>}
                {r.status === 'OPEN' && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:underline"
                      onClick={async () => {
                        await adminApi.updateReport(r.id, 'DISMISSED');
                        await onReload();
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={async () => {
                        await adminApi.updateReport(r.id, 'ACTIONED');
                        await onReload();
                      }}
                    >
                      Mark actioned
                    </button>
                    {(r.targetUser || r.company) && (
                      <button
                        type="button"
                        className="text-xs text-amber-400 hover:underline"
                        onClick={() => {
                          const id = r.targetUser?.id ?? r.company!.user.id;
                          const uname = r.targetUser?.username ?? r.company!.user.username;
                          onBanUser(id, uname);
                        }}
                      >
                        Ban account
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Ban appeals</h2>
        <p className="mt-1 text-xs text-slate-500">Review suspension appeals submitted by users from the sign-in page.</p>
        {banAppeals.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No pending appeals.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {banAppeals.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-800 p-4 text-sm">
                <p className="font-medium text-slate-200">
                  @{a.user.username} · {a.user.email}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {new Date(a.createdAt).toLocaleString()}
                  {a.user.banReason ? ` · Ban reason: ${a.user.banReason}` : ''}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-slate-300">{a.message}</p>
                {a.explanation && (
                  <div className="mt-3 rounded-lg border border-slate-800 bg-surface-900/50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Supporting details</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-400">{a.explanation}</p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary text-xs" onClick={() => onReviewAppeal(a.id, 'APPROVED')}>
                    Approve
                  </button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => onReviewAppeal(a.id, 'REJECTED')}>
                    Reject
                  </button>
                  <Link to={`/profile/${a.user.username}`} className="self-center text-xs text-brand-400 hover:underline">
                    View profile
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
