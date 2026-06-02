import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const authUser = await currentUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.emailAddresses[0]?.emailAddress || 'unknown',
    },
  });

  return NextResponse.json({
    id: user.id,
    plan: user.plan,
    email: user.email,
    lifetimeSessionsUsed: user.lifetimeSessionsUsed,
  });
}
