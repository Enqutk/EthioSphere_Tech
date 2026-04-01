'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { postsApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

type Post = {
  id: string;
  title: string;
  body: string;
  section: string;
  solved: boolean;
  author: { id: string; name: string; username: string; avatarUrl?: string | null };
  comments: { id: string; body: string; isSolution: boolean; author: { id: string; name: string; username: string }; createdAt: string }[];
};

const SECTIONS: Record<string, string> = {
  GENERAL: 'General',
  DEBUG_HELP: 'Debug help',
  PROJECT_FEEDBACK: 'Project feedback',
  ANNOUNCEMENTS: 'Announcements',
  REACT: 'React',
  NODE: 'Node',
  PYTHON: 'Python',
  OTHER: 'Other',
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    postsApi
      .get(id)
      .then((data) => setPost(data as Post))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token || !user || !comment.trim()) return;
    setSubmitting(true);
    try {
      await postsApi.addComment(token, id, { body: comment.trim() });
      const updated = await postsApi.get(id);
      setPost(updated as Post);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-red-400">Post not found</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/community" className="text-sm text-slate-400 hover:text-brand-400">← Back to community</Link>
      <div className="card mt-4 p-8">
        <span className="text-xs text-slate-500">{SECTIONS[post.section] ?? post.section}</span>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">{post.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/profile/${post.author.username}`} className="hover:text-brand-400">
            @{post.author.username}
          </Link>
          {post.solved && <span className="text-green-400">Solved</span>}
        </div>
        <p className="mt-6 whitespace-pre-wrap text-slate-300">{post.body}</p>
      </div>

      <div className="mt-8">
        <h2 className="font-mono text-lg font-medium text-slate-200">Comments ({post.comments?.length ?? 0})</h2>
        {user ? (
          <form onSubmit={handleSubmitComment} className="mt-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              className="input min-h-[100px] resize-y"
              required
            />
            <button type="submit" className="btn-primary mt-3" disabled={submitting || !comment.trim()}>
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            <Link href="/login" className="text-brand-400 hover:underline">Log in</Link> to comment.
          </p>
        )}
        <ul className="mt-6 space-y-4">
          {(post.comments ?? []).map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/profile/${c.author.username}`} className="font-medium text-slate-200 hover:text-brand-400">
                  @{c.author.username}
                </Link>
                {c.isSolution && <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Solution</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{c.body}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
