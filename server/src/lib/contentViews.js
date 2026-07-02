/** @returns {boolean} true when a new unique view was recorded */
export async function recordUniqueContentView(prisma, { entityType, entityId, viewerKey, userId }) {
  try {
    await prisma.contentView.create({
      data: {
        entityType,
        entityId,
        viewerKey,
        userId: userId || null,
      },
    });
    return true;
  } catch (err) {
    if (err?.code === 'P2002') return false;
    throw err;
  }
}
