import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashResetToken } from './passwordReset.js';

test('hashResetToken is deterministic', () => {
  assert.equal(hashResetToken('abc'), hashResetToken('abc'));
});

test('hashResetToken differs for different inputs', () => {
  assert.notEqual(hashResetToken('abc'), hashResetToken('def'));
});
