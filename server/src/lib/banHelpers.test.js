import { test } from 'node:test';
import assert from 'node:assert/strict';
import { banStatusPayload } from './banHelpers.js';

test('banStatusPayload marks permanent ban when banExpiresAt is null', () => {
  const payload = banStatusPayload({
    banReason: 'Repeated spam',
    bannedAt: new Date('2026-01-01T00:00:00.000Z'),
    banExpiresAt: null,
    pendingAppeal: null,
  });

  assert.equal(payload.code, 'ACCOUNT_BANNED');
  assert.equal(payload.isPermanent, true);
  assert.equal(payload.canAppeal, true);
  assert.equal(payload.appealStatus, null);
});

test('banStatusPayload blocks new appeal when one is pending', () => {
  const payload = banStatusPayload({
    banReason: 'Harassment',
    bannedAt: new Date('2026-01-01T00:00:00.000Z'),
    banExpiresAt: new Date('2026-06-01T00:00:00.000Z'),
    pendingAppeal: { status: 'PENDING' },
  });

  assert.equal(payload.isPermanent, false);
  assert.equal(payload.canAppeal, false);
  assert.equal(payload.appealStatus, 'PENDING');
});
