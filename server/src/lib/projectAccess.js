/** Who can see projects in the global list */
export function projectListVisibilityWhere(viewerId) {
  if (!viewerId) {
    return { visibility: 'PUBLIC' };
  }
  return {
    OR: [
      { visibility: 'PUBLIC' },
      {
        visibility: 'PRIVATE',
        OR: [{ ownerId: viewerId }, { members: { some: { userId: viewerId } } }],
      },
      {
        visibility: 'FOLLOWERS_ONLY',
        OR: [
          { ownerId: viewerId },
          { members: { some: { userId: viewerId } } },
          {
            owner: {
              followsIncoming: {
                some: { followerId: viewerId, status: 'ACCEPTED' },
              },
            },
          },
        ],
      },
    ],
  };
}

export async function canViewProject(prisma, project, viewerId) {
  if (project.visibility === 'PUBLIC') return true;
  if (!viewerId) return false;
  if (project.ownerId === viewerId) return true;
  const member = await prisma.projectMember.findFirst({
    where: { projectId: project.id, userId: viewerId },
  });
  if (member) return true;
  if (project.visibility === 'PRIVATE') return false;
  if (project.visibility === 'FOLLOWERS_ONLY') {
    const f = await prisma.follow.findFirst({
      where: {
        followerId: viewerId,
        followingId: project.ownerId,
        status: 'ACCEPTED',
      },
    });
    return !!f;
  }
  return false;
}

/** Batch visibility for post/project list items — avoids N+1 canViewProject calls. */
export async function projectPayloadsForViewer(prisma, projects, viewerId) {
  const map = new Map();
  const linked = (projects || []).filter(Boolean);
  if (!linked.length) return map;

  if (!viewerId) {
    for (const p of linked) {
      if (p.visibility === 'PUBLIC') {
        map.set(p.id, { id: p.id, title: p.title, githubFullName: p.githubFullName });
      }
    }
    return map;
  }

  const projectIds = linked.map((p) => p.id);
  const restricted = linked.filter((p) => p.visibility !== 'PUBLIC');
  const ownerIds = [...new Set(restricted.map((p) => p.ownerId))];

  const [memberships, follows] = await Promise.all([
    restricted.length
      ? prisma.projectMember.findMany({
          where: { userId: viewerId, projectId: { in: projectIds } },
          select: { projectId: true },
        })
      : [],
    ownerIds.length
      ? prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: ownerIds }, status: 'ACCEPTED' },
          select: { followingId: true },
        })
      : [],
  ]);

  const memberIds = new Set(memberships.map((m) => m.projectId));
  const followedOwners = new Set(follows.map((f) => f.followingId));

  for (const p of linked) {
    let visible = false;
    if (p.visibility === 'PUBLIC') visible = true;
    else if (p.ownerId === viewerId) visible = true;
    else if (memberIds.has(p.id)) visible = true;
    else if (p.visibility === 'FOLLOWERS_ONLY' && followedOwners.has(p.ownerId)) visible = true;
    if (visible) {
      map.set(p.id, { id: p.id, title: p.title, githubFullName: p.githubFullName });
    }
  }
  return map;
}

/** Projects shown on a user's profile */
export function ownedProjectsVisibleWhere(profileOwnerId, viewerId) {
  const byOwner = { ownerId: profileOwnerId };
  if (!viewerId) {
    return { ...byOwner, visibility: 'PUBLIC' };
  }
  if (viewerId === profileOwnerId) {
    return byOwner;
  }
  return {
    AND: [
      byOwner,
      {
        OR: [
          { visibility: 'PUBLIC' },
          {
            visibility: 'PRIVATE',
            members: { some: { userId: viewerId } },
          },
          {
            visibility: 'FOLLOWERS_ONLY',
            OR: [
              { members: { some: { userId: viewerId } } },
              {
                owner: {
                  followsIncoming: {
                    some: { followerId: viewerId, status: 'ACCEPTED' },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
