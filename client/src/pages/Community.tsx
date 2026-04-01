import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '@/lib/api';

type Post = {
  id: string;
  title: string;
  body: string;
  section: string;
  solved: boolean;
  author: { id: string; name: string; username: string };
  _count?: { comments: number };
  upvotes?: number;
};

const SECTIONS: Record<string, string> = {
  GENERAL: 'General', DEBUG_HELP: 'Debug help', PROJECT_FEEDBACK: 'Project feedback', ANNOUNCEMENTS: 'Announcements',
  REACT: 'React', NODE: 'Node', PYTHON: 'Python', OTHER: 'Other',
};

export default function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('');

  useEffect(() => {
    postsApi.list(section ? { section } : undefined).then((data) => setPosts(data as Post[])).finally(() => setLoading(false));
  }, [section]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-slate-100">Community</h1>
          <p className="mt-2 text-slate-400">Discuss, get debug help, and share feedback.</p>
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
      ) : posts.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">No posts yet. Start a discussion.</div>
      ) : (
        <ul className="mt-8 space-y-4">
          {posts.map((p) => (
            <li key={p.id}>
              <Link to={`/community/${p.id}`} className="card block p-6 transition hover:border-brand-500/50">
                <h2 className="font-mono font-semibold text-slate-100">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.body}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>{SECTIONS[p.section] ?? p.section}</span>
                  <span>by @{p.author.username}</span>
                  {p.solved && <span className="text-green-400">Solved</span>}
                  {p._count?.comments != null && <span>{p._count.comments} comments</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
