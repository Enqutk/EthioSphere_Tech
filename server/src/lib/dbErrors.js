/**
 * Map Prisma / driver errors to user-facing hints (Neon, schema drift, etc.).
 * @param {unknown} err
 * @returns {{ hint?: string, prismaCode?: string }}
 */
export function extrasForPrismaError(err) {
  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
  const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
  const prismaCode = typeof code === 'string' ? code : undefined;

  if (prismaCode === 'P1001' || /Can't reach database server|reach database server at/i.test(message)) {
    return {
      prismaCode: prismaCode || 'P1001',
      hint:
        'Cannot reach PostgreSQL (often Neon is asleep on the free tier). Open the Neon dashboard, select your project to wake it, wait ~30s, then retry. Confirm server/.env DATABASE_URL matches Neon “Connection string” (pooled host ending in -pooler) and includes sslmode=require.',
    };
  }
  if (prismaCode === 'P2022' || /column .* does not exist|Unknown column/i.test(message)) {
    return {
      prismaCode,
      hint: 'Run `npx prisma db push` from the server folder so the database matches the Prisma schema.',
    };
  }
  if (prismaCode === 'P2021' || /does not exist in the current database|The table .* does not exist/i.test(message)) {
    return {
      prismaCode,
      hint: 'Run `npx prisma db push` from the server folder so all tables exist (e.g. dm_threads, follows).',
    };
  }
  return { prismaCode };
}

/**
 * Consistent JSON 500 for route catch blocks (Neon / schema hints for the client).
 * @param {import('express').Response} res
 * @param {unknown} err
 * @param {string} logLabel
 * @param {string} errorTitle
 */
export function sendRouteError(res, err, logLabel, errorTitle) {
  console.error(logLabel, err);
  const dev = process.env.NODE_ENV !== 'production';
  const { hint, prismaCode } = extrasForPrismaError(err);
  const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
  res.status(500).json({
    error: errorTitle,
    ...(dev && { details: msg, ...(prismaCode ? { code: prismaCode } : {}) }),
    ...(hint && { hint }),
  });
}
