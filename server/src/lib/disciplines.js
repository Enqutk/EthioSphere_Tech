/** Shared discipline & project team role constants (server). */

export const PRIMARY_DISCIPLINES = ['DEVELOPER', 'UI_UX', 'GRAPHICS', 'DEVOPS', 'PM'];

export const DISCIPLINE_LABELS = {
  DEVELOPER: 'Developer',
  UI_UX: 'UI/UX Designer',
  GRAPHICS: 'Graphics Designer',
  DEVOPS: 'DevOps Engineer',
  PM: 'Project Manager',
};

/** API / form values → Prisma enum */
export function parsePrimaryDiscipline(input) {
  if (!input || typeof input !== 'string') return 'DEVELOPER';
  const key = input.trim().toUpperCase().replace(/-/g, '_');
  const aliases = {
    DEVELOPER: 'DEVELOPER',
    DEV: 'DEVELOPER',
    UI_UX: 'UI_UX',
    UIUX: 'UI_UX',
    UX: 'UI_UX',
    GRAPHICS: 'GRAPHICS',
    GRAPHIC: 'GRAPHICS',
    DEVOPS: 'DEVOPS',
    PM: 'PM',
    PROJECT_MANAGER: 'PM',
  };
  const mapped = aliases[key] || key;
  return PRIMARY_DISCIPLINES.includes(mapped) ? mapped : 'DEVELOPER';
}

export const PROJECT_TEAM_ROLES = ['frontend', 'backend', 'fullstack', 'ui_ux', 'graphics', 'devops', 'pm'];

export const PROJECT_ROLE_LABELS = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full stack',
  ui_ux: 'UI/UX',
  graphics: 'Graphics',
  devops: 'DevOps',
  pm: 'Project Manager',
};

export function isValidProjectRole(role) {
  return typeof role === 'string' && PROJECT_TEAM_ROLES.includes(role.trim().toLowerCase());
}

export function normalizeProjectRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return isValidProjectRole(r) ? r : null;
}

export function normalizeRolesNeeded(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const item of input) {
    const r = normalizeProjectRole(item);
    if (r && !out.includes(r)) out.push(r);
  }
  return out.slice(0, 8);
}

export function normalizeDesignLinks(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const allowed = ['figma', 'behance', 'dribbble'];
  const out = {};
  for (const key of allowed) {
    const raw = input[key];
    if (typeof raw !== 'string') continue;
    const t = raw.trim();
    if (!t) continue;
    try {
      const u = new URL(t);
      if (['http:', 'https:'].includes(u.protocol)) out[key] = t.slice(0, 2048);
    } catch {
      /* skip invalid */
    }
  }
  return Object.keys(out).length ? out : null;
}
