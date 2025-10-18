export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/server/db';
import { verifyToken } from '@/src/features/auth/service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('smartspeak_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);

  try {
    const recording = await prisma.recording.findFirst({
      where: { id: params.id, userId: user.sub },
      include: { metrics: true, tips: { orderBy: { priority: 'asc' } } }
    });
    if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(recording);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load recording' }, { status: 500 });
  }
}
