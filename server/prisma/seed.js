import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const demoHash = await bcrypt.hash('demo1234', 10);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@programmers.world' },
    update: {},
    create: {
      email: 'demo@programmers.world',
      passwordHash: demoHash,
      name: 'Demo User',
      username: 'demo',
      rank: 'JUNIOR_DEV',
      bio: 'Just here to try Programmers World.',
      skills: ['JavaScript', 'React', 'Node.js'],
      isAdmin: false,
    },
  });
  console.log('Created/updated user:', demo.username);

  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'admin1234';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@programmers.world' },
    update: {
      isAdmin: true,
      passwordHash: adminHash,
    },
    create: {
      email: 'admin@programmers.world',
      passwordHash: adminHash,
      name: 'Admin',
      username: 'admin',
      rank: 'ELITE_ARCHITECT',
      bio: 'Seeded administrator account.',
      skills: [],
      isAdmin: true,
    },
  });
  console.log('Created/updated admin:', admin.username, '(password from ADMIN_SEED_PASSWORD or default admin1234)');

  const existing = await prisma.challenge.findFirst({ where: { title: 'FizzBuzz' } });
  if (!existing) {
    const challenge = await prisma.challenge.create({
      data: {
        title: 'FizzBuzz',
        description:
          'Write a function that prints numbers 1 to N. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for both print "FizzBuzz". Submit a link to your solution (e.g. GitHub gist).',
        difficulty: 'EASY',
        rewardPoints: 10,
        active: true,
      },
    });
    console.log('Created challenge:', challenge.title);
  } else {
    console.log('Challenge FizzBuzz already exists');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
