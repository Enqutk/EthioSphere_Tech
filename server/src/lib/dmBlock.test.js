import { test } from 'node:test';
import assert from 'node:assert/strict';

test('assertCanSendDm blocks when recipient blocked sender', async () => {
  const { assertCanSendDm } = await import('./dmBlock.js');
  const prisma = {
    userBlock: {
      findUnique: async ({ where }) => {
        if (where.blockerId_blockedId.blockerId === 'b' && where.blockerId_blockedId.blockedId === 'a') {
          return { id: '1' };
        }
        return null;
      },
    },
  };
  const denied = await assertCanSendDm(prisma, 'a', 'b');
  assert.equal(denied?.status, 403);
  assert.match(denied?.error, /cannot message/i);
});

test('assertCanSendDm blocks when sender blocked recipient', async () => {
  const { assertCanSendDm } = await import('./dmBlock.js');
  const prisma = {
    userBlock: {
      findUnique: async ({ where }) => {
        if (where.blockerId_blockedId.blockerId === 'a' && where.blockerId_blockedId.blockedId === 'b') {
          return { id: '1' };
        }
        return null;
      },
    },
  };
  const denied = await assertCanSendDm(prisma, 'a', 'b');
  assert.equal(denied?.status, 403);
  assert.match(denied?.error, /blocked this user/i);
});

test('assertCanViewDmThread denies when other user blocked viewer', async () => {
  const { assertCanViewDmThread } = await import('./dmBlock.js');
  const prisma = {
    userBlock: {
      findUnique: async ({ where }) => {
        if (where.blockerId_blockedId.blockerId === 'other' && where.blockerId_blockedId.blockedId === 'me') {
          return { id: '1' };
        }
        return null;
      },
    },
  };
  const denied = await assertCanViewDmThread(prisma, 'me', 'other');
  assert.equal(denied?.status, 403);
});
