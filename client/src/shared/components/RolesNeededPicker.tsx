import { PROJECT_TEAM_ROLES, PROJECT_ROLE_LABELS, type ProjectTeamRole } from '@/shared/constants/disciplines';

type Props = {
  value: ProjectTeamRole[];
  onChange: (next: ProjectTeamRole[]) => void;
  idPrefix?: string;
};

/** Multi-select checkboxes for project team roles being recruited. */
export function RolesNeededPicker({ value, onChange, idPrefix = 'role' }: Props) {
  function toggle(role: ProjectTeamRole) {
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_TEAM_ROLES.map((role) => (
        <label
          key={role}
          htmlFor={`${idPrefix}-${role}`}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
            value.includes(role)
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-200'
              : 'border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <input
            id={`${idPrefix}-${role}`}
            type="checkbox"
            className="sr-only"
            checked={value.includes(role)}
            onChange={() => toggle(role)}
          />
          {PROJECT_ROLE_LABELS[role]}
        </label>
      ))}
    </div>
  );
}

export function RolesNeededBadges({ roles }: { roles: string[] }) {
  if (!roles?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">Recruiting:</span>
      {roles.map((role) => (
        <span key={role} className="rounded bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
          {PROJECT_ROLE_LABELS[role as ProjectTeamRole] ?? role}
        </span>
      ))}
    </div>
  );
}
