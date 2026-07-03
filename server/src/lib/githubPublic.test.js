import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterGithubContributors, isIgnoredGithubContributor } from './githubPublic.js';

test('isIgnoredGithubContributor hides Cursor bots', () => {
  assert.equal(isIgnoredGithubContributor('cursor'), true);
  assert.equal(isIgnoredGithubContributor('Cursor'), true);
  assert.equal(isIgnoredGithubContributor('cursoragent'), true);
  assert.equal(isIgnoredGithubContributor('cursor[bot]'), true);
  assert.equal(isIgnoredGithubContributor('Enqutk'), false);
});

test('filterGithubContributors removes ignored logins', () => {
  const out = filterGithubContributors([
    { login: 'Enqutk', contributions: 10 },
    { login: 'cursoragent', contributions: 5 },
    { login: 'cursor', contributions: 2 },
  ]);
  assert.deepEqual(out.map((c) => c.login), ['Enqutk']);
});
