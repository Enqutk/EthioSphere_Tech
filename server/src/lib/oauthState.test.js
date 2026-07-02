import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signedOAuthState,
  verifySignedOAuthState,
  buildExpiredOAuthState,
} from './oauthState.js';

test('verifySignedOAuthState accepts a freshly signed state', () => {
  const state = signedOAuthState({ from: '/projects' });
  const data = verifySignedOAuthState(state);
  assert.ok(data);
  assert.equal(data.from, '/projects');
  assert.ok(typeof data.ts === 'number');
  assert.ok(data.nonce);
});

test('verifySignedOAuthState rejects tampered signature', () => {
  const state = signedOAuthState();
  const tampered = `${state.slice(0, -1)}x`;
  assert.equal(verifySignedOAuthState(tampered), null);
});

test('verifySignedOAuthState rejects expired state', () => {
  const expired = buildExpiredOAuthState({ from: '/' });
  assert.equal(verifySignedOAuthState(expired), null);
});

test('verifySignedOAuthState rejects malformed state', () => {
  assert.equal(verifySignedOAuthState(''), null);
  assert.equal(verifySignedOAuthState('not-valid'), null);
});
