import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { canUserCreateChallenge, challengeCreateRequirementText } from './challengeEligibility.js';
import { hasDatabaseUrl } from '../test/httpHelpers.js';

test('challengeCreateRequirementText mentions minimum completions', () => {
  const text = challengeCreateRequirementText();
  assert.match(text, /Newbies who completed at least \d+ different challenges/);
});

describe('canUserCreateChallenge', { skip: !hasDatabaseUrl() }, () => {
  let adminId;
  let juniorId;
  let newbieId;
  let challengeIds = [];

  before(async () => {
    const ts = Date.now();
    const passwordHash = await bcrypt.hash('test', 4);

    const admin = await prisma.user.create({
      data: {
        email: `ch-admin-${ts}@example.com`,
        username: `chadmin${ts}`,
        name: 'Admin',
        passwordHash,
        isAdmin: true,
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    adminId = admin.id;

    const junior = await prisma.user.create({
      data: {
        email: `ch-junior-${ts}@example.com`,
        username: `chjunior${ts}`,
        name: 'Junior',
        passwordHash,
        rank: 'JUNIOR_DEV',
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    juniorId = junior.id;

    const newbie = await prisma.user.create({
      data: {
        email: `ch-newbie-${ts}@example.com`,
        username: `chnewbie${ts}`,
        name: 'Newbie',
        passwordHash,
        rank: 'NEWBIE',
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    newbieId = newbie.id;

    for (let i = 0; i < 3; i++) {
      const ch = await prisma.challenge.create({
        data: {
          title: `Test challenge ${ts}-${i}`,
          description: 'Eligibility test challenge',
          difficulty: 'EASY',
          rewardPoints: 5,
        },
      });
      challengeIds.push(ch.id);
      await prisma.challengeSubmission.create({
        data: {
          challengeId: ch.id,
          userId: newbieId,
          solutionText: 'console.log("hi")',
          points: 5,
        },
      });
    }
  });

  after(async () => {
    if (newbieId) {
      await prisma.challengeSubmission.deleteMany({ where: { userId: newbieId } });
    }
    if (challengeIds.length) {
      await prisma.challenge.deleteMany({ where: { id: { in: challengeIds } } });
    }
    const ids = [adminId, juniorId, newbieId].filter(Boolean);
    if (ids.length) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  test('allows admins', async () => {
    assert.equal(await canUserCreateChallenge({ id: adminId, isAdmin: true }), true);
  });

  test('allows junior rank without submissions', async () => {
    assert.equal(await canUserCreateChallenge({ id: juniorId, rank: 'JUNIOR_DEV' }), true);
  });

  test('allows newbie after enough distinct challenge completions', async () => {
    assert.equal(await canUserCreateChallenge({ id: newbieId, rank: 'NEWBIE' }), true);
  });
});

describe('canUserCreateChallenge newbie without completions', { skip: !hasDatabaseUrl() }, () => {
  let userId;

  before(async () => {
    const ts = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `ch-fresh-${ts}@example.com`,
        username: `chfresh${ts}`,
        name: 'Fresh Newbie',
        passwordHash: await bcrypt.hash('test', 4),
        rank: 'NEWBIE',
        termsAcceptedAt: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    userId = user.id;
  });

  after(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  test('blocks newbie without completions', async () => {
    assert.equal(await canUserCreateChallenge({ id: userId, rank: 'NEWBIE' }), false);
  });
});
