/** Pulse = weighted engagement for dev-style leaderboards. */

export function postPulseScore({ upvotes, downvotes, viewCount, commentCount }) {
  const u = Number(upvotes) || 0;
  const d = Number(downvotes) || 0;
  const v = Number(viewCount) || 0;
  const c = Number(commentCount) || 0;
  const net = u - d;
  return Math.max(0, net * 12 + v + c * 5);
}

export function projectPulseScore({ likeCount, viewCount, memberCount, repoStars }) {
  const l = Number(likeCount) || 0;
  const v = Number(viewCount) || 0;
  const m = Number(memberCount) || 0;
  const s = Math.min(Number(repoStars) || 0, 400);
  return Math.max(0, l * 18 + v + m * 12 + s);
}
