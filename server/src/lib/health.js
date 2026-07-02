import { prisma } from './prisma.js';

export async function checkDatabaseHealth() {
  if (!prisma) {
    return { ok: false, error: 'Prisma client unavailable' };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Database unreachable' };
  }
}
