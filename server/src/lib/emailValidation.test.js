import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseStrictEmail, validateDeliverableEmail } from '../lib/emailValidation.js';

describe('parseStrictEmail', () => {
  test('accepts normal addresses', () => {
    const r = parseStrictEmail('Dev.User+tag@Gmail.com');
    assert.equal(r.ok, true);
    assert.equal(r.email, 'dev.user+tag@gmail.com');
  });

  test('rejects malformed', () => {
    assert.equal(parseStrictEmail('not-an-email').ok, false);
    assert.equal(parseStrictEmail('a@b').ok, false);
  });

  test('rejects digit-heavy nonsense domains', () => {
    assert.equal(parseStrictEmail('abcd@jenwonwefo13124.com').ok, false);
    assert.equal(
      parseStrictEmail('abb@jkbrfew392847928yrqjkboubwdoiuqb0835urefhlfjk.com').ok,
      false,
    );
  });

  test('rejects disposable hosts', () => {
    assert.equal(parseStrictEmail('x@mailinator.com').ok, false);
  });
});

describe('validateDeliverableEmail', () => {
  test('skips DNS in test and still rejects bad format', async () => {
    const bad = await validateDeliverableEmail('abcd@jenwonwefo13124.com');
    assert.equal(bad.ok, false);
    const good = await validateDeliverableEmail('someone@example.com');
    assert.equal(good.ok, true);
  });
});
