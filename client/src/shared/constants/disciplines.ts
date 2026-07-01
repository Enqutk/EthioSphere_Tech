export type PrimaryDiscipline = 'DEVELOPER' | 'UI_UX' | 'GRAPHICS' | 'DEVOPS' | 'PM';

export type DesignLinks = {
  figma?: string;
  behance?: string;
  dribbble?: string;
};

export const PRIMARY_DISCIPLINES: PrimaryDiscipline[] = ['DEVELOPER', 'UI_UX', 'GRAPHICS', 'DEVOPS', 'PM'];

export const DISCIPLINE_LABELS: Record<PrimaryDiscipline, string> = {
  DEVELOPER: 'Developer',
  UI_UX: 'UI/UX Designer',
  GRAPHICS: 'Graphics Designer',
  DEVOPS: 'DevOps Engineer',
  PM: 'Project Manager',
};

export const DISCIPLINE_SKILL_HINTS: Record<PrimaryDiscipline, string> = {
  DEVELOPER: 'React, Node.js, TypeScript',
  UI_UX: 'Figma, Wireframing, Design systems',
  GRAPHICS: 'Illustrator, Photoshop, Branding',
  DEVOPS: 'Docker, CI/CD, AWS',
  PM: 'Agile, Scrum, Roadmapping',
};

export type ProjectTeamRole = 'frontend' | 'backend' | 'fullstack' | 'ui_ux' | 'graphics' | 'devops' | 'pm';

export const PROJECT_TEAM_ROLES: ProjectTeamRole[] = [
  'frontend',
  'backend',
  'fullstack',
  'ui_ux',
  'graphics',
  'devops',
  'pm',
];

export const PROJECT_ROLE_LABELS: Record<ProjectTeamRole, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full stack',
  ui_ux: 'UI/UX',
  graphics: 'Graphics',
  devops: 'DevOps',
  pm: 'Project Manager',
};

/** Registration / form slug → enum */
export function parseDisciplineSlug(slug: string): PrimaryDiscipline {
  const map: Record<string, PrimaryDiscipline> = {
    developer: 'DEVELOPER',
    ui_ux: 'UI_UX',
    graphics: 'GRAPHICS',
    devops: 'DEVOPS',
    pm: 'PM',
  };
  return map[slug] ?? 'DEVELOPER';
}

export function disciplineBadgeLabel(discipline: PrimaryDiscipline | undefined, rankLabel?: string): string {
  if (!discipline || discipline === 'DEVELOPER') return rankLabel || 'Developer';
  return DISCIPLINE_LABELS[discipline];
}
