import type { GithubContributor } from '@/pages/project-detail/types';

/** Hide Cursor / AI tooling bots from the contributors panel. */
export function isIgnoredGithubContributor(login: string | undefined | null): boolean {
  if (!login) return true;
  const normalized = login.toLowerCase();
  if (normalized === 'cursor' || normalized === 'cursoragent') return true;
  if (normalized.startsWith('cursor') && normalized.endsWith('[bot]')) return true;
  return false;
}

export function visibleGithubContributors(contributors: GithubContributor[] | undefined | null) {
  return (contributors || []).filter((c) => !isIgnoredGithubContributor(c.login));
}
