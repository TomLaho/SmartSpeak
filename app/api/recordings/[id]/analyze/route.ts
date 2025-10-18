export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { analyzeRecording } from '@/src/services/analysis';
import { verifyToken } from '@/src/features/auth/service';
import { prisma } from '@/src/server/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('smartspeak_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);

  const recording = await prisma.recording.findFirst({ where: { id: params.id, userId: user.sub } });
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const result = await analyzeRecording(recording.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
