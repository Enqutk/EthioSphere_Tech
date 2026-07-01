import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createPrismaClient() {
  try {
    return new PrismaClient();
  } catch (err) {
    console.error('PrismaClient init failed:', err);
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
