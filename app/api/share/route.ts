export const runtime = 'nodejs';

import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/server/db';
import { verifyToken } from '@/src/features/auth/service';

export async function POST(req: NextRequest) {
  const tokenValue = req.cookies.get('smartspeak_token')?.value;
  if (!tokenValue) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(tokenValue);

  const { recordingId } = await req.json();
  if (!recordingId) return NextResponse.json({ error: 'Recording ID required' }, { status: 400 });

  const recording = await prisma.recording.findFirst({ where: { id: recordingId, userId: user.sub } });
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = randomBytes(12).toString('hex');

  const shareToken = await prisma.shareToken.upsert({
    where: { recordingId },
    update: { token },
    create: { recordingId, token }
  });

  return NextResponse.json({ token: shareToken.token });
}
