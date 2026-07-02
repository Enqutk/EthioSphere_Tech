export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

/** True when the company owner can submit (or re-submit) a verification request. */
export function canApplyForVerification(
  status?: VerificationStatus | string | null,
  requestedAt?: string | null,
): boolean {
  if (!status || status === 'UNVERIFIED' || status === 'REJECTED') return true;
  if (status === 'PENDING' && !requestedAt) return true;
  return false;
}

export function hasVerificationUnderReview(
  status?: VerificationStatus | string | null,
  requestedAt?: string | null,
): boolean {
  return status === 'PENDING' && Boolean(requestedAt);
}
