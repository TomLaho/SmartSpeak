import { File } from 'node:buffer';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchObjectStream } from '@/lib/storage';
import { getOpenAI, TRANSCRIBE_MODEL } from '@/lib/openai';
import { canUseSession } from '@/lib/plan';
import { rateLimit } from '@/lib/rate-limit';
import { SessionStatus } from '@prisma/client';

const schema = z.object({ sessionId: z.string() });

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  let parsedSessionId: string | null = null;
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const { sessionId } = schema.parse(body);
    parsedSessionId = sessionId;

    const rate = rateLimit(`transcribe:${user.id}`);
    if (!rate.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await prisma.speechSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!canUseSession(user, session)) {
      return NextResponse.json({ error: 'Upgrade required', remaining: 0 }, { status: 402 });
    }

    const stream = await fetchObjectStream(session.audioKey);
    const audioBuffer = await streamToBuffer(stream);

    const transcriptResponse = await getOpenAI().audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.wav'),
      model: TRANSCRIBE_MODEL,
      response_format: 'text',
    });

    await prisma.speechSession.update({
      where: { id: sessionId },
      data: {
        transcript: transcriptResponse,
        status: SessionStatus.TRANSCRIBED,
        error: null,
      },
    });

    return NextResponse.json({ transcript: transcriptResponse });
  } catch (error) {
    console.error('[transcribe]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      if (parsedSessionId) {
        await prisma.speechSession.update({ where: { id: parsedSessionId }, data: { status: SessionStatus.FAILED, error: message } });
      }
    } catch (_) {
      // best effort
    }
    return NextResponse.json({ error: 'Unable to transcribe audio', message }, { status: 500 });
  }
}
