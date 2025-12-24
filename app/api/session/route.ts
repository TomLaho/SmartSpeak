import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SessionMode, SessionStatus } from '@prisma/client';

const schema = z.object({
  title: z.string().min(1),
  mode: z.nativeEnum(SessionMode),
  promptText: z.string().optional(),
  audioKey: z.string(),
  audioMimeType: z.string(),
  durationSeconds: z.number().min(0).max(600).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const data = schema.parse(body);

    const session = await prisma.speechSession.create({
      data: {
        ...data,
        userId: user.id,
        status: SessionStatus.UPLOADED,
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[session]', error);
    return NextResponse.json({ error: 'Unable to create session' }, { status: 400 });
  }
}
