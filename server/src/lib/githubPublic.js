/**
 * Public GitHub REST API helpers (no OAuth). Optional GITHUB_TOKEN raises rate limits.
 * https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#user-agent-required
 */

const USER_AGENT = process.env.GITHUB_API_USER_AGENT || 'ProgrammersWorld/1.0';

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * @param {string} path e.g. /users/octocat
 */
export async function githubFetchJson(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return { ok: false, status: 404 };
  if (res.status === 403) {
    const j = await res.json().catch(() => ({}));
    return { ok: false, status: 403, message: j.message || 'GitHub API rate limit or forbidden' };
  }
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, status: res.status, message: t.slice(0, 200) };
  }
  const data = await res.json();
  return { ok: true, data };
}

/** GitHub username login rules (simplified) */
const LOGIN_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const RESERVED_USER_PATHS = new Set([
  'orgs',
  'settings',
  'topics',
  'explore',
  'marketplace',
  'sponsors',
  'login',
  'signup',
  'features',
  'enterprise',
]);

/**
 * @param {string} input URL, @handle, or plain login
 * @returns {string | null} login
 */
export function parseGithubUserLogin(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().replace(/^@/, '');
  if (LOGIN_RE.test(s) && !s.includes('/')) return s;
  const m = s.match(/github\.com\/([^/?#]+)/i);
  if (m) {
    const first = m[1].split('/')[0];
    if (RESERVED_USER_PATHS.has(first.toLowerCase())) return null;
    return LOGIN_RE.test(first) ? first : null;
  }
  return null;
}

/**
 * @param {string} urlOrPath
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGithubRepo(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const s = urlOrPath.trim();
  const m = s.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!m) return null;
  const owner = m[1];
  let repo = m[2].replace(/\.git$/, '');
  const skip = new Set(['pull', 'issues', 'tree', 'blob', 'commits', 'settings', 'wiki', 'actions', 'security']);
  if (!LOGIN_RE.test(owner) || skip.has(repo.toLowerCase())) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(repo)) return null;
  return { owner, repo };
}

/**
 * @param {object} user GitHub /users/:login JSON
 * @returns {'NEWBIE'|'JUNIOR_DEV'|'PRO_DEV'|'ELITE_ARCHITECT'}
 */
export function inferRankFromGithub(user) {
  const repos = Number(user.public_repos) || 0;
  const followers = Number(user.followers) || 0;
  const created = user.created_at ? new Date(user.created_at) : new Date();
  const months = Math.max(0, (Date.now() - created.getTime()) / (30 * 24 * 60 * 60 * 1000));
  if (repos >= 50 || followers >= 150) return 'ELITE_ARCHITECT';
  if (repos >= 20 || followers >= 40) return 'PRO_DEV';
  if (repos >= 3 || followers >= 8 || months >= 6) return 'JUNIOR_DEV';
  return 'NEWBIE';
}

export async function fetchGithubUser(login) {
  return githubFetchJson(`/users/${encodeURIComponent(login)}`);
}

export async function fetchGithubRepo(owner, repo) {
  return githubFetchJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

/**
 * @returns {Promise<{ ok: true, htmlUrl: string, fullName: string, description: string | null } | { ok: false, reason: string, message?: string }>}
 */
export async function verifyPublicGithubRepo(urlOrPath) {
  const parsed = parseGithubRepo(urlOrPath);
  if (!parsed) return { ok: false, reason: 'not_a_repo_url' };
  const r = await fetchGithubRepo(parsed.owner, parsed.repo);
  if (!r.ok) {
    if (r.status === 404) return { ok: false, reason: 'not_found_or_private' };
    return { ok: false, reason: 'api_error', message: r.message };
  }
  const d = r.data;
  if (d.private) return { ok: false, reason: 'private' };
  return {
    ok: true,
    htmlUrl: d.html_url,
    fullName: d.full_name,
    description: d.description ? String(d.description).slice(0, 500) : null,
  };
}
