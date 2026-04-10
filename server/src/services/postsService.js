import { prisma } from '../lib/prisma.js';
import { postPulseScore } from '../lib/pulseScore.js';
import { canViewProject } from '../lib/projectAccess.js';

const postProjectSelect = {
  id: true,
  title: true,
  githubFullName: true,
  visibility: true,
  ownerId: true,
};

export function getPostProjectSelect() {
  return postProjectSelect;
}

export async function projectPayloadForViewer(project, viewerId) {
  if (!project) return null;
  const ok = await canViewProject(prisma, project, viewerId);
  if (!ok) return null;
  return { id: project.id, title: project.title, githubFullName: project.githubFullName };
}

export async function postVoteTalliesForIds(postIds) {
  const map = new Map();
  for (const id of postIds) map.set(id, { up: 0, down: 0 });
  if (!postIds.length) return map;
  const rows = await prisma.postVote.groupBy({
    by: ['postId', 'upvote'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  for (const r of rows) {
    const cur = map.get(r.postId);
    if (!cur) continue;
    if (r.upvote) cur.up = r._count._all;
    else cur.down = r._count._all;
  }
  return map;
}

export async function viewerVotesForPosts(viewerId, postIds) {
  const map = new Map();
  if (!viewerId || !postIds.length) return map;
  const rows = await prisma.postVote.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true, upvote: true },
  });
  for (const r of rows) map.set(r.postId, r.upvote);
  return map;
}

export function shapePostListItem(p, tallies, viewerVoteMap, project) {
  const { _count, project: _proj, ...rest } = p;
  const t = tallies.get(p.id) || { up: 0, down: 0 };
  const commentCount = _count.comments;
  const pulseScore = postPulseScore({
    upvotes: t.up,
    downvotes: t.down,
    viewCount: p.viewCount,
    commentCount,
  });
  const viewerVote = viewerVoteMap.has(p.id) ? (viewerVoteMap.get(p.id) ? 'up' : 'down') : null;
  return {
    ...rest,
    project,
    upvotes: t.up,
    downvotes: t.down,
    pulseScore,
    commentCount,
    viewerVote,
  };
}

export async function listPostsForViewer({ section, search, viewerId }) {
  const where = {};
  if (section) where.section = section;
  if (search && String(search).trim()) {
    where.OR = [
      { title: { contains: String(search).trim(), mode: 'insensitive' } },
      { body: { contains: String(search).trim(), mode: 'insensitive' } },
    ];
  }
  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      project: { select: postProjectSelect },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const ids = posts.map((p) => p.id);
  const [tallies, viewerVoteMap] = await Promise.all([
    postVoteTalliesForIds(ids),
    viewerVotesForPosts(viewerId, ids),
  ]);
  return Promise.all(
    posts.map(async (p) => {
      const project = await projectPayloadForViewer(p.project, viewerId);
      return shapePostListItem(p, tallies, viewerVoteMap, project);
    }),
  );
}

export async function getPostDetailForViewer(postId, viewerId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
      project: { select: postProjectSelect },
      comments: {
        include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { comments: true } },
    },
  });
  if (!post) return null;

  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
  const viewCount = post.viewCount + 1;
  const project = await projectPayloadForViewer(post.project, viewerId);
  const tallies = await postVoteTalliesForIds([post.id]);
  const t = tallies.get(post.id) || { up: 0, down: 0 };
  const commentCount = post._count.comments;
  const pulseScore = postPulseScore({ upvotes: t.up, downvotes: t.down, viewCount, commentCount });

  let viewerVote = null;
  if (viewerId) {
    const v = await prisma.postVote.findUnique({
      where: { postId_userId: { postId: post.id, userId: viewerId } },
    });
    if (v) viewerVote = v.upvote ? 'up' : 'down';
  }

  const { project: _p, _count, ...rest } = post;
  return {
    ...rest,
    viewCount,
    project,
    upvotes: t.up,
    downvotes: t.down,
    pulseScore,
    commentCount,
    viewerVote,
  };
}
