export function isUniqueConstraintError(err) {
  return err?.code === 'P2002';
}
