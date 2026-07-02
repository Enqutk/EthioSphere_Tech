import { prisma } from '../lib/prisma.js';
import { parseGithubRepo, verifyPublicGithubRepo, buildPublicRepoBundle } from '../lib/githubPublic.js';
import { projectListVisibilityWhere, canViewProject } from '../lib/projectAccess.js';
import { projectPulseScore } from '../lib/pulseScore.js';
import { normalizeProjectRole, normalizeRolesNeeded } from '../lib/disciplines.js';
import { paginatedResult } from '../lib/pagination.js';

const GITHUB_SYNC_MS = 10 * 60 * 1000;
const githubRefreshInFlight = new Set();

export const projectInclude = {
  owner: { select: { id: true, name: true, username: true, avatarUrl: true, rank: true } },
  members: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
};

export const projectIncludeList = {
  owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
  members: { select: { role: true, user: { select: { id: true, name: true, username: true } } } },
};

export function omitReadmeFromGithubData(githubData) {
  if (!githubData || typeof githubData !== 'object' || Array.isArray(githubData)) return githubData;
  const { readme: _r, ...rest } = githubData;
  return rest;
}

function repoStarsFromGithubData(gh) {
  if (!gh || typeof gh !== 'object' || !gh.repo || typeof gh.repo !== 'object') return 0;
  return Number(gh.repo.stargazers_count) || 0;
}

export async function listProjectsForViewer({ viewerId, status, type, search, take = 50, skip = 0 }) {
  const filters = [projectListVisibilityWhere(viewerId)];
  if (status) filters.push({ status });
  if (type) filters.push({ type });
  if (search && String(search).trim()) {
    const s = String(search).trim();
    filters.push({
      OR: [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { githubFullName: { contains: s, mode: 'insensitive' } },
      ],
    });
  }
  const where = filters.length === 1 ? filters[0] : { AND: filters };
  const projects = await prisma.project.findMany({
    where,
    include: projectIncludeList,
    orderBy: { createdAt: 'desc' },
    skip,
    take: take + 1,
  });
  let likedIds = new Set();
  if (viewerId && projects.length) {
    const likes = await prisma.projectLike.findMany({
      where: { userId: viewerId, projectId: { in: projects.map((x) => x.id) } },
      select: { projectId: true },
    });
    likedIds = new Set(likes.map((l) => l.projectId));
  }

  const items = projects.map((p) => {
    const gh = p.githubData ? omitReadmeFromGithubData(p.githubData) : p.githubData;
    const memberCount = 1 + (p.members?.length || 0);
    const pulseScore = projectPulseScore({
      likeCount: p.likeCount,
      viewCount: p.viewCount,
      memberCount,
      repoStars: repoStarsFromGithubData(gh),
    });
    return {
      ...p,
      githubData: gh,
      pulseScore,
      likedByViewer: viewerId ? likedIds.has(p.id) : false,
    };
  });

  return paginatedResult(items, { take, skip });
}

export async function getProjectDetailForViewer(projectId, viewerId) {
  let project = await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude });
  if (!project) return { notFound: true };

  const allowed = await canViewProject(prisma, project, viewerId);
  if (!allowed) return { notFound: true };

  let githubRefreshScheduled = false;
  if (project.githubFullName) {
    const synced = project.githubSyncedAt ? new Date(project.githubSyncedAt).getTime() : 0;
    const stale = !project.githubSyncedAt || Date.now() - synced > GITHUB_SYNC_MS;
    if (stale) {
      const slash = project.githubFullName.indexOf('/');
      if (slash > 0) {
        const owner = project.githubFullName.slice(0, slash);
        const repo = project.githubFullName.slice(slash + 1);
        const pid = project.id;
        if (!githubRefreshInFlight.has(pid)) {
          githubRefreshInFlight.add(pid);
          githubRefreshScheduled = true;
          void (async () => {
            try {
              const bundle = await buildPublicRepoBundle(owner, repo);
              if (bundle.ok) {
                await prisma.project.update({
                  where: { id: pid },
                  data: {
                    githubData: bundle.payload,
                    githubSyncedAt: new Date(),
                    githubHtmlUrl: bundle.apiRepo.html_url,
                  },
                });
              }
            } catch (e) {
              console.error('Background GitHub refresh failed', pid, e);
            } finally {
              githubRefreshInFlight.delete(pid);
            }
          })();
        }
      }
    }
  }

  await prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });
  const viewCount = project.viewCount + 1;
  let likedByViewer = false;
  if (viewerId) {
    likedByViewer = Boolean(
      await prisma.projectLike.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: viewerId } },
      }),
    );
  }
  const ghOut = project.githubData ? omitReadmeFromGithubData(project.githubData) : project.githubData;
  const memberCount = 1 + (project.members?.length || 0);
  const pulseScore = projectPulseScore({
    likeCount: project.likeCount,
    viewCount,
    memberCount,
    repoStars: repoStarsFromGithubData(ghOut),
  });
  return {
    notFound: false,
    githubRefreshScheduled,
    project: { ...project, githubData: ghOut, viewCount, pulseScore, likedByViewer },
  };
}

export async function toggleProjectLike(projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { notFound: true };
  const allowed = await canViewProject(prisma, project, userId);
  if (!allowed) return { notFound: true };

  const existing = await prisma.projectLike.findUnique({
    where: { projectId_userId: { projectId: project.id, userId } },
  });
  const extraMembers = await prisma.projectMember.count({ where: { projectId: project.id } });
  const memberCount = 1 + extraMembers;
  const gh = project.githubData ? omitReadmeFromGithubData(project.githubData) : project.githubData;

  if (existing) {
    await prisma.$transaction([
      prisma.projectLike.delete({ where: { id: existing.id } }),
      prisma.project.update({ where: { id: project.id }, data: { likeCount: { decrement: 1 } } }),
    ]);
    const likeCount = Math.max(0, project.likeCount - 1);
    const pulseScore = projectPulseScore({
      likeCount,
      viewCount: project.viewCount,
      memberCount,
      repoStars: repoStarsFromGithubData(gh),
    });
    return { notFound: false, payload: { liked: false, likeCount, pulseScore } };
  }

  await prisma.$transaction([
    prisma.projectLike.create({ data: { projectId: project.id, userId } }),
    prisma.project.update({ where: { id: project.id }, data: { likeCount: { increment: 1 } } }),
  ]);
  const likeCount = project.likeCount + 1;
  const pulseScore = projectPulseScore({
    likeCount,
    viewCount: project.viewCount,
    memberCount,
    repoStars: repoStarsFromGithubData(gh),
  });
  return { notFound: false, payload: { liked: true, likeCount, pulseScore } };
}

export async function createProjectFromGithub(userId, body) {
  const rawGithub = String(body.githubRepoUrl).trim();
  if (!parseGithubRepo(rawGithub)) {
    return { badRequest: { error: 'Invalid GitHub repository URL', hint: 'Use https://github.com/owner/repository' } };
  }
  const verified = await verifyPublicGithubRepo(rawGithub);
  if (!verified.ok) {
    return { badRequest: { error: 'Repository must exist on GitHub and be public.', reason: verified.reason } };
  }

  const { owner, repo } = parseGithubRepo(rawGithub);
  const bundle = await buildPublicRepoBundle(owner, repo);
  if (!bundle.ok) {
    return { badGateway: { error: 'Could not load repository data from GitHub', ...(bundle.message && { details: bundle.message }) } };
  }

  const apiRepo = bundle.apiRepo;
  const title = (body.title && String(body.title).trim()) || apiRepo.name || apiRepo.full_name;
  const description =
    (body.description != null && String(body.description).trim()) ||
    (apiRepo.description && String(apiRepo.description).trim()) ||
    'No description on GitHub.';

  const visibility = ['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'].includes(body.visibility)
    ? body.visibility
    : 'PUBLIC';
  const seekingReview = Boolean(body.seekingReview);
  const rolesNeeded = normalizeRolesNeeded(body.rolesNeeded);

  const project = await prisma.project.create({
    data: {
      title: title.slice(0, 200),
      description,
      type: body.type || 'LEARNING',
      visibility,
      seekingReview,
      rolesNeeded,
      ownerId: userId,
      githubHtmlUrl: apiRepo.html_url,
      githubFullName: apiRepo.full_name,
      githubData: bundle.payload,
      githubSyncedAt: new Date(),
    },
    include: { owner: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });
  return { created: project };
}

export async function updateProjectByOwner(projectId, userId, body) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { notFound: true };
  if (project.ownerId !== userId) return { forbidden: true };

  const { title, description, status, type, visibility, seekingReview, rolesNeeded } = body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (type !== undefined) data.type = type;
  if (visibility !== undefined) data.visibility = visibility;
  if (seekingReview !== undefined) data.seekingReview = Boolean(seekingReview);
  if (rolesNeeded !== undefined) data.rolesNeeded = normalizeRolesNeeded(rolesNeeded);

  const rawGithub = typeof body.githubRepoUrl === 'string' ? body.githubRepoUrl.trim() : '';
  if (rawGithub) {
    if (!parseGithubRepo(rawGithub)) {
      return { badRequest: { error: 'Invalid GitHub repository URL', hint: 'Use https://github.com/owner/repository' } };
    }
    const verified = await verifyPublicGithubRepo(rawGithub);
    if (!verified.ok) {
      return { badRequest: { error: 'Repository must exist on GitHub and be public.', reason: verified.reason } };
    }
    const { owner, repo } = parseGithubRepo(rawGithub);
    const bundle = await buildPublicRepoBundle(owner, repo);
    if (!bundle.ok) {
      return { badGateway: { error: 'Could not load repository data from GitHub', ...(bundle.message && { details: bundle.message }) } };
    }
    data.githubHtmlUrl = bundle.apiRepo.html_url;
    data.githubFullName = bundle.apiRepo.full_name;
    data.githubData = bundle.payload;
    data.githubSyncedAt = new Date();
  }

  if (Object.keys(data).length === 0) return { badRequest: { error: 'No valid fields to update' } };

  const updated = await prisma.project.update({ where: { id: projectId }, data, include: projectInclude });
  return { updated };
}

export async function joinProject(projectId, userId, role) {
  const normalizedRole = normalizeProjectRole(role);
  if (!normalizedRole) {
    return { badRequest: { error: 'Invalid team role', hint: 'Choose a valid role such as ui_ux, graphics, devops, or pm.' } };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { notFound: true };
  const allowed = await canViewProject(prisma, project, userId);
  if (!allowed) return { notFound: true };
  if (project.ownerId === userId) return { badRequest: { error: 'Owner is already a member' } };
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) return { badRequest: { error: 'Already a member' } };
  const member = await prisma.projectMember.create({
    data: { projectId, userId, role: normalizedRole },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });
  return { created: member };
}

export async function leaveProject(projectId, userId) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return { notFound: true };
  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  return { ok: true };
}
