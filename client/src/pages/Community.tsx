import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { PulseStrip } from '@/shared/components/PulseStrip';
import { ListFetchError } from '@/shared/components/ListFetchError';
import { formatLoadError } from '@/shared/lib/loadError';

type Post = {
  id: string;
  title: string;
  body: string;
  section: string;
  solved: boolean;
  repoFullName?: string | null;
  repoPublic?: boolean | null;
  project?: { id: string; title: string; githubFullName?: string | null } | null;
  author: { id: string; name: string; username: string };
  commentCount?: number;
  viewCount?: number;
  pulseScore?: number;
  upvotes?: number;
  downvotes?: number;
};

const SECTIONS: Record<string, string> = {
  GENERAL: 'General', DEBUG_HELP: 'Debug help', PROJECT_FEEDBACK: 'Project feedback', ANNOUNCEMENTS: 'Announcements',
  REACT: 'React', NODE: 'Node', PYTHON: 'Python', OTHER: 'Other',
};

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    postsApi
      .list(section ? { section } : undefined)
      .then((page) => {
        setPosts(page.items as Post[]);
        setHasMore(page.pagination.hasMore);
        setNextSkip(page.pagination.nextSkip);
      })
      .catch((err) => setError(formatLoadError(err)))
      .finally(() => setLoading(false));
  }, [section, retryCount]);

  const loadMore = () => {
    if (loadingMore || !hasMore || nextSkip == null) return;
    setLoadingMore(true);
    postsApi
      .list({ ...(section ? { section } : {}), skip: nextSkip })
      .then((page) => {
        setPosts((prev) => [...prev, ...(page.items as Post[])]);
        setHasMore(page.pagination.hasMore);
        setNextSkip(page.pagination.nextSkip);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-slate-100">Community</h1>
          <p className="mt-2 text-slate-400">
            Discuss, get debug help, and share feedback.{' '}
            {user ? (
              <Link to="/buddies" className="text-brand-400 hover:underline">
                Follow authors
              </Link>
            ) : (
              <Link to="/register" className="text-brand-400 hover:underline">
                Join and follow developers
              </Link>
            )}{' '}
            to stay on their threads and projects.
          </p>
        </div>
        <Link to="/community/new" className="btn-primary text-sm">New post</Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setSection('')} className={`rounded-lg px-3 py-1.5 text-sm ${!section ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-slate-400 hover:text-slate-200'}`}>All</button>
        {Object.entries(SECTIONS).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setSection(value)} className={`rounded-lg px-3 py-1.5 text-sm ${section === value ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-slate-400 hover:text-slate-200'}`}>{label}</button>
        ))}
      </div>
      {loading ? (
        <div className="mt-12 text-center text-slate-400">Loading posts…</div>
      ) : error ? (
        <ListFetchError message={error} onRetry={() => setRetryCount((n) => n + 1)} />
      ) : posts.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">No posts yet. Start a discussion.</div>
      ) : (
        <ul className="mt-8 space-y-4">
          {posts.map((p) => (
            <li key={p.id}>
              <div className="card p-6 transition hover:border-brand-500/50">
                <Link to={`/community/${p.id}`} className="block">
                  <h2 className="font-mono font-semibold text-slate-100">{p.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.body}</p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <Link to={`/community/${p.id}`} className="hover:text-brand-400">{SECTIONS[p.section] ?? p.section}</Link>
                    <Link to={`/profile/${p.author.username}`} className="hover:text-brand-400">
                      @{p.author.username}
                    </Link>
                  {p.solved && <span className="text-green-400">Solved</span>}
                  {p.project && (
                    <Link
                      to={`/projects/${p.project.id}`}
                      className="rounded bg-brand-500/15 px-2 py-0.5 font-mono text-brand-400 hover:bg-brand-500/25"
                    >
                      Project: {p.project.title}
                      {p.project.githubFullName ? ` · ${p.project.githubFullName}` : ''}
                    </Link>
                  )}
                  {p.repoPublic && p.repoFullName && (
                    <span className="rounded bg-slate-700/80 px-2 py-0.5 font-mono text-slate-300">📂 {p.repoFullName}</span>
                  )}
                  {p.commentCount != null && (
                    <Link to={`/community/${p.id}`} className="hover:text-brand-400">{p.commentCount} comments</Link>
                  )}
                  </div>
                  <FollowCreatorActions username={p.author.username} userId={p.author.id} compact />
                </div>
                {(p.pulseScore != null || p.viewCount != null) && (
                  <div className="mt-3 border-t border-slate-800/80 pt-3">
                    <PulseStrip
                      pulse={p.pulseScore ?? 0}
                      views={p.viewCount ?? 0}
                      rep={p.upvotes != null && p.downvotes != null ? p.upvotes - p.downvotes : p.upvotes}
                      repLabel="net++"
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && hasMore && (
        <div className="mt-8 text-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? 'Loading…' : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  );
}
