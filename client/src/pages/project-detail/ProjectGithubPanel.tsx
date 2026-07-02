import { lazy, Suspense } from 'react';
import type { GithubDataBundle, GithubRepoInfo } from './types';
import { LanguageBars } from './LanguageBars';

const ReadmePreview = lazy(() =>
  import('@/shared/components/ReadmePreview').then((m) => ({ default: m.ReadmePreview })),
);

type Props = {
  githubFullName?: string | null;
  githubHtmlUrl?: string | null;
  gh: GithubDataBundle | null | undefined;
  repo: GithubRepoInfo | null | undefined;
  languages: Record<string, number>;
  hasLanguages: boolean;
};

export function ProjectGithubPanel({ githubFullName, githubHtmlUrl, gh, repo, languages, hasLanguages }: Props) {
  if (!githubFullName) {
    return (
      <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        This project has no linked GitHub repository (legacy). New projects require a public repo.
      </p>
    );
  }

  if (!repo && githubHtmlUrl) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        Full GitHub metadata could not be loaded.{' '}
        <a href={githubHtmlUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
          Open the repository on GitHub
        </a>
        .
      </p>
    );
  }

  if (!repo) return null;

  return (
    <div className="mt-8 space-y-8 border-t border-slate-700 pt-8">
      <h2 className="font-mono text-lg font-medium text-slate-200">From GitHub</h2>

      {repo.description && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Repository description</h3>
          <p className="mt-1 text-slate-300">{repo.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Stars', repo.stargazers_count],
          ['Forks', repo.forks_count],
          ['Open issues', repo.open_issues_count],
          ['Watchers', repo.watchers_count ?? repo.subscribers_count],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-lg bg-surface-800/80 px-3 py-2">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="font-mono text-lg text-slate-100">{val ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
        {repo.default_branch && (
          <span>
            Default branch: <code className="text-brand-400">{repo.default_branch}</code>
          </span>
        )}
        {repo.language && (
          <span>
            Primary language: <span className="text-slate-200">{repo.language}</span>
          </span>
        )}
        {repo.visibility && <span>Visibility: {repo.visibility}</span>}
        {repo.pushed_at && <span>Last push: {new Date(repo.pushed_at).toLocaleDateString()}</span>}
        {repo.size != null && <span>Size: {repo.size} KB (GitHub index)</span>}
      </div>

      {repo.homepage && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Homepage</h3>
          <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-brand-400 hover:underline">
            {repo.homepage}
          </a>
        </div>
      )}

      {repo.topics && repo.topics.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Topics</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {repo.topics.map((t) => (
              <span key={t} className="rounded-full bg-surface-800 px-2.5 py-0.5 text-xs text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {repo.license && (repo.license.name || repo.license.spdx_id) && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">License</h3>
          <p className="mt-1 text-slate-300">
            {repo.license.name}{' '}
            {repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? `(${repo.license.spdx_id})` : ''}
          </p>
        </div>
      )}

      {repo.owner?.login && (
        <div className="flex items-center gap-3">
          {repo.owner.avatar_url && (
            <img src={repo.owner.avatar_url} alt="" className="h-10 w-10 rounded-full border border-slate-600" />
          )}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner on GitHub</h3>
            {repo.owner.html_url ? (
              <a href={repo.owner.html_url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                @{repo.owner.login}
              </a>
            ) : (
              <span className="text-slate-300">@{repo.owner.login}</span>
            )}
          </div>
        </div>
      )}

      {hasLanguages && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Languages</h3>
          <div className="mt-3">
            <LanguageBars languages={languages} />
          </div>
        </div>
      )}

      {gh?.contributors && gh.contributors.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Contributors</h3>
          <ul className="mt-3 flex flex-wrap gap-3">
            {gh.contributors.map((c) => (
              <li key={c.login}>
                {c.html_url ? (
                  <a
                    href={c.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-400"
                  >
                    {c.avatar_url && <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full" />}
                    <span>@{c.login}</span>
                    {c.contributions != null && <span className="text-xs text-slate-500">({c.contributions})</span>}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">@{c.login}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gh?.readme && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">README</h3>
          <div className="mt-2 max-h-[min(70vh,32rem)] overflow-auto rounded-lg border border-slate-700 bg-surface-950 p-4">
            <Suspense fallback={<p className="text-sm text-slate-500">Loading README…</p>}>
              <ReadmePreview markdown={gh.readme} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
