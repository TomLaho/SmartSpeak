import { currentUser } from '@clerk/nextjs';
import { prisma } from './db';
import { Plan } from '@prisma/client';

export async function getOrCreateUser() {
  const user = await currentUser();
  if (!user || !user.id || !user.emailAddresses[0]) {
    throw new Error('Unauthorized');
  }

  const email = user.emailAddresses[0].emailAddress.toLowerCase();
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email,
      plan: Plan.FREE,
    },
    update: {
      email,
    },
  });

  return dbUser;
}
