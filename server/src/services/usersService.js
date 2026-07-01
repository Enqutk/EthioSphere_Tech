import { prisma } from '../lib/prisma.js';
import { ownedProjectsVisibleWhere } from '../lib/projectAccess.js';
import { parsePrimaryDiscipline, normalizeDesignLinks } from '../lib/disciplines.js';

export function normalizeProfileSections(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const title = typeof s.title === 'string' ? s.title.trim() : '';
      const content = typeof s.content === 'string' ? s.content.trim() : '';
      if (!title || !content) return null;
      return { title: title.slice(0, 80), content: content.slice(0, 4000) };
    })
    .filter(Boolean)
    .slice(0, 12);
}

export async function getCurrentUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      rank: true,
      githubUrl: true,
      portfolioUrl: true,
      skills: true,
      profileSections: true,
      isAdmin: true,
      accountType: true,
      primaryDiscipline: true,
      designLinks: true,
      company: {
        select: {
          id: true,
          legalName: true,
          website: true,
          description: true,
          verificationStatus: true,
          verifiedAt: true,
          _count: { select: { likes: true, reviews: true } },
        },
      },
      createdAt: true,
    },
  });
}

export async function discoverUsers({ q, skill, discipline, viewerId, take }) {
  const andParts = [];
  if (viewerId) andParts.push({ NOT: { id: viewerId } });
  if (skill) andParts.push({ skills: { has: skill } });
  if (discipline) {
    const d = parsePrimaryDiscipline(discipline);
    andParts.push({ primaryDiscipline: d, accountType: 'DEVELOPER' });
  }
  if (q) {
    andParts.push({
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
  const where = andParts.length ? { AND: andParts } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      rank: true,
      primaryDiscipline: true,
      skills: true,
      projectsOwned: {
        where: { visibility: 'PUBLIC' },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { id: true, title: true, githubFullName: true },
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { id: true, title: true, section: true },
      },
    },
  });

  const followByUserId = {};
  if (viewerId && users.length > 0) {
    const ids = users.map((u) => u.id);
    const [outboundRows, inboundRows] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: viewerId, followingId: { in: ids } } }),
      prisma.follow.findMany({ where: { followerId: { in: ids }, followingId: viewerId } }),
    ]);
    for (const u of users) {
      const ob = outboundRows.find((f) => f.followingId === u.id);
      const ib = inboundRows.find((f) => f.followerId === u.id);
      if (ob) followByUserId[u.id] = { direction: 'outbound', status: ob.status, id: ob.id };
      else if (ib) followByUserId[u.id] = { direction: 'inbound', status: ib.status, id: ib.id };
      else followByUserId[u.id] = { direction: 'none', status: null, id: null };
    }
  }

  return { users, followByUserId };
}

export async function getPublicProfileByUsername(username, viewerId) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      rank: true,
      githubUrl: true,
      portfolioUrl: true,
      skills: true,
      profileSections: true,
      accountType: true,
      primaryDiscipline: true,
      designLinks: true,
      isBanned: true,
      banReason: true,
      company: {
        select: {
          id: true,
          legalName: true,
          website: true,
          description: true,
          verificationStatus: true,
          verifiedAt: true,
          _count: { select: { likes: true, reviews: true } },
        },
      },
      badges: { select: { badgeType: true, earnedAt: true } },
    },
  });
  if (!user) return null;

  if (user.isBanned) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      accountType: user.accountType,
      isBanned: true,
      banReason: user.banReason,
      company: user.company,
      projectsOwned: [],
      followersCount: 0,
      followingCount: 0,
      followForViewer: null,
    };
  }

  const projectsOwned = await prisma.project.findMany({
    where: ownedProjectsVisibleWhere(user.id, viewerId),
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      visibility: true,
      seekingReview: true,
      githubFullName: true,
      githubHtmlUrl: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const [followersAccepted, followingAccepted] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id, status: 'ACCEPTED' } }),
    prisma.follow.count({ where: { followerId: user.id, status: 'ACCEPTED' } }),
  ]);

  let followForViewer = null;
  if (viewerId && viewerId !== user.id) {
    const outbound = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    });
    const inbound = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
    });
    if (outbound) followForViewer = { direction: 'outbound', status: outbound.status, id: outbound.id };
    else if (inbound) followForViewer = { direction: 'inbound', status: inbound.status, id: inbound.id };
    else followForViewer = { direction: 'none', status: null, id: null };
  }

  return {
    ...user,
    projectsOwned,
    followersCount: followersAccepted,
    followingCount: followingAccepted,
    followForViewer,
  };
}

export async function updateCurrentUserProfile(userId, payload) {
  return prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      rank: true,
      githubUrl: true,
      portfolioUrl: true,
      skills: true,
      profileSections: true,
      isAdmin: true,
      primaryDiscipline: true,
      designLinks: true,
    },
  });
}
