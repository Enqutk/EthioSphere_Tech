import { Link } from 'react-router-dom';
import type { AdminUser } from './types';

type Props = {
  users: AdminUser[];
  currentUserId: string;
  onToggleBan: (user: AdminUser) => void;
  onDeleteUser: (id: string, username: string) => void;
};

export function AdminUsersSection({ users, currentUserId, onToggleBan, onDeleteUser }: Props) {
  return (
    <section className="mt-12">
      <h2 className="font-mono text-lg text-slate-200">Users</h2>
      <p className="mt-1 text-xs text-slate-500">Ban suspends login and API access. Delete is permanent.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/80">
                <td className="px-4 py-3">
                  <Link to={`/profile/${u.username}`} className="font-mono text-brand-400 hover:underline">
                    @{u.username}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-xs">
                  {u.isAdmin ? <span className="text-amber-400">Admin</span> : u.accountType === 'COMPANY' ? 'Company' : 'Developer'}
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.isBanned ? (
                    <span className="text-red-400">
                      Banned
                      {u.banExpiresAt ? ` until ${new Date(u.banExpiresAt).toLocaleDateString()}` : ' (permanent)'}
                    </span>
                  ) : (
                    <span className="text-slate-500">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {u._count.posts} posts · {u._count.projectsOwned} projects
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId && !u.isAdmin ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <button type="button" className="text-xs text-amber-400 hover:underline" onClick={() => onToggleBan(u)}>
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => onDeleteUser(u.id, u.username)}>
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
