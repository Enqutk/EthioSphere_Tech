export const SITE = {
  name: 'Programmers World',
  tagline: 'Build, learn, and connect with developers worldwide.',
  githubRepoUrl: 'https://github.com/Enqutk/EthioSphere_Tech',
  supportEmail: 'support@programmers.world',
} as const;

export const SITE_NAME = SITE.name;
export const SITE_TAGLINE = 'Learn, Build, Compete';
export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const DEFAULT_DESCRIPTION =
  'GitHub-verified developer ranks, project showcases, coding challenges, and community — build your reputation and grow with other programmers.';

export function siteUrl() {
  return (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '') || '';
}

export function absoluteUrl(path = '/') {
  const base = siteUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
