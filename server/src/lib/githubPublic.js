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

/** Subset of GitHub repo JSON for UI + cache */
export function pickRepoDisplayFields(d) {
  if (!d || typeof d !== 'object') return null;
  return {
    full_name: d.full_name,
    html_url: d.html_url,
    name: d.name,
    description: d.description,
    stargazers_count: d.stargazers_count,
    forks_count: d.forks_count,
    open_issues_count: d.open_issues_count,
    watchers_count: d.watchers_count,
    subscribers_count: d.subscribers_count,
    default_branch: d.default_branch,
    homepage: d.homepage,
    topics: d.topics,
    archived: d.archived,
    disabled: d.disabled,
    visibility: d.visibility,
    fork: d.fork,
    parent: d.parent?.full_name ?? null,
    created_at: d.created_at,
    updated_at: d.updated_at,
    pushed_at: d.pushed_at,
    size: d.size,
    language: d.language,
    has_wiki: d.has_wiki,
    has_issues: d.has_issues,
    has_projects: d.has_projects,
    has_discussions: d.has_discussions,
    is_template: d.is_template,
    owner: d.owner
      ? {
          login: d.owner.login,
          avatar_url: d.owner.avatar_url,
          html_url: d.owner.html_url,
          type: d.owner.type,
        }
      : null,
    license: d.license
      ? { key: d.license.key, name: d.license.name, spdx_id: d.license.spdx_id }
      : null,
  };
}

export async function fetchReadmeRaw(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    {
      headers: {
        Accept: 'application/vnd.github.raw',
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (res.status === 404) return '';
  if (!res.ok) return '';
  const text = await res.text();
  return text.slice(0, 120000);
}

export async function fetchRepoLanguages(owner, repo) {
  const r = await githubFetchJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
  return r.ok && r.data && typeof r.data === 'object' ? r.data : {};
}

export async function fetchRepoContributors(owner, repo) {
  const r = await githubFetchJson(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=40`,
  );
  if (!r.ok || !Array.isArray(r.data)) return [];
  return r.data.map((c) => ({
    login: c.login,
    id: c.id,
    contributions: c.contributions,
    avatar_url: c.avatar_url,
    html_url: c.html_url,
    type: c.type,
  }));
}

/**
 * Full public snapshot for a repository (for project pages).
 * @returns {Promise<{ ok: true, payload: object, apiRepo: object } | { ok: false, message?: string, status?: number }>}
 */
export async function buildPublicRepoBundle(owner, repo) {
  const r = await fetchGithubRepo(owner, repo);
  if (!r.ok) {
    return { ok: false, status: r.status, message: r.message || 'Could not load repository' };
  }
  if (r.data.private) {
    return { ok: false, message: 'Repository is private' };
  }
  const [readme, languages, contributors] = await Promise.all([
    fetchReadmeRaw(owner, repo),
    fetchRepoLanguages(owner, repo),
    fetchRepoContributors(owner, repo),
  ]);
  const payload = {
    repo: pickRepoDisplayFields(r.data),
    languages,
    readme: readme || null,
    contributors,
  };
  return { ok: true, payload, apiRepo: r.data };
}
