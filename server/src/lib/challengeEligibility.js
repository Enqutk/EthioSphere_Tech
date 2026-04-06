import { prisma } from './prisma.js';

/** Min distinct challenges a Newbie must complete before they can author challenges. */
const MIN_DISTINCT_CHALLENGES = Math.max(
  1,
  Math.min(50, Number(process.env.CHALLENGE_CREATE_MIN_COMPLETED || 3) || 3),
);

/**
 * Admins always; otherwise Junior+ rank, or Newbie with enough distinct challenge submissions.
 * @param {{ id: string, rank: string, isAdmin?: boolean }} user
 */
export async function canUserCreateChallenge(user) {
  if (!user?.id) return false;
  if (user.isAdmin) return true;
  if (user.rank && user.rank !== 'NEWBIE') return true;
  const grouped = await prisma.challengeSubmission.groupBy({
    by: ['challengeId'],
    where: { userId: user.id },
  });
  return grouped.length >= MIN_DISTINCT_CHALLENGES;
}

export function challengeCreateRequirementText() {
  return `Admins, anyone ranked Junior Dev or higher, or Newbies who completed at least ${MIN_DISTINCT_CHALLENGES} different challenges.`;
}
