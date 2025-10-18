export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/server/db';
import { verifyToken } from '@/src/features/auth/service';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('smartspeak_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);

  try {
    const recordings = await prisma.recording.findMany({
      where: { userId: user.sub },
      include: { metrics: true },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    const timeline = recordings
      .filter((recording) => recording.metrics)
      .map((recording) => ({
        id: recording.id,
        title: recording.title,
        createdAt: recording.createdAt,
        ...recording.metrics!
      }));

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
