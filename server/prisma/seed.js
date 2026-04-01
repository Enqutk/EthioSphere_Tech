import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@programmers.world' },
    update: {},
    create: {
      email: 'demo@programmers.world',
      passwordHash: hash,
      name: 'Demo User',
      username: 'demo',
      rank: 'JUNIOR_DEV',
      bio: 'Just here to try Programmers World.',
      skills: ['JavaScript', 'React', 'Node.js'],
    },
  });
  console.log('Created/updated user:', user.username);

  const existing = await prisma.challenge.findFirst({ where: { title: 'FizzBuzz' } });
  if (!existing) {
    const challenge = await prisma.challenge.create({
      data: {
        title: 'FizzBuzz',
        description: 'Write a function that prints numbers 1 to N. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for both print "FizzBuzz". Submit a link to your solution (e.g. GitHub gist).',
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
