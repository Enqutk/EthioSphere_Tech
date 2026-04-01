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
