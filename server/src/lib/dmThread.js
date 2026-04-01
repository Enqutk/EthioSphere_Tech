/** Lexicographic order so (A,B) and (B,A) map to one thread */
export function sortedUserPair(userIdA, userIdB) {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export async function getOrCreateDmThread(prisma, userIdA, userIdB) {
  const [user1Id, user2Id] = sortedUserPair(userIdA, userIdB);
  return prisma.dmThread.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
  });
}
