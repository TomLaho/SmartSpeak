export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/server/db';
import { storage } from '@/src/services/storage';
import { verifyToken } from '@/src/features/auth/service';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav'];

const createSchema = z.object({
  title: z.string().min(1)
});

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('smartspeak_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    const recordings = await prisma.recording.findMany({
      where: { userId: user.sub },
      include: { metrics: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ recordings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load recordings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('smartspeak_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);

  try {
    const formData = await req.formData();
    const title = formData.get('title');
    const file = formData.get('file');
    const parsed = createSchema.parse({ title });

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.save(buffer, file.name);

    const recording = await prisma.recording.create({
      data: {
        userId: user.sub,
        title: parsed.title,
        originalUrl: stored.url,
        audioUrl: stored.url.replace(/\.[^.]+$/, '.wav'),
        durationSec: Math.round((buffer.length / (16 * 1024)) % 480) + 120,
        transcript: '',
        language: 'en'
      }
    });

    return NextResponse.json({ recording });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
  }
}
