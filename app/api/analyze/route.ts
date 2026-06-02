import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeMetrics } from '@/lib/metrics';
import { COACH_MODEL, getOpenAI } from '@/lib/openai';
import { canUseSession } from '@/lib/plan';
import { rateLimit } from '@/lib/rate-limit';
import { Plan, SessionStatus } from '@prisma/client';

const schema = z.object({
  sessionId: z.string(),
  editedTranscript: z.string().optional(),
});

const feedbackSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  quickWins: z.array(z.string()),
  paceFeedback: z.string(),
  clarityFeedback: z.string(),
  structureFeedback: z.string(),
  confidenceFeedback: z.string(),
  overallSummary: z.string(),
});

export async function POST(req: Request) {
  let body: any = null;
  try {
    const user = await getOrCreateUser();
    body = await req.json();
    const { sessionId, editedTranscript } = schema.parse(body);

    const rate = rateLimit(`analyze:${user.id}`);
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

    const transcript = (editedTranscript || session.transcript || '').trim();
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript required before analysis' }, { status: 400 });
    }

    const metrics = computeMetrics(transcript, session.durationSeconds || undefined);

    const prompt = `You are SmartSpeak, an AI speech coach. Given a transcript, return concise JSON feedback.
Respond ONLY with JSON matching:
{
  "strengths": ["string"],
  "improvements": ["string"],
  "quickWins": ["string"],
  "paceFeedback": "string",
  "clarityFeedback": "string",
  "structureFeedback": "string",
  "confidenceFeedback": "string",
  "overallSummary": "string"
}
Limit total characters to 1200.
Transcript:\\n${transcript}`;

    const completion = await getOpenAI().chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: 'Provide actionable but concise speech coaching.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = feedbackSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error('LLM returned invalid feedback');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.speechSession.update({
        where: { id: sessionId },
        data: {
          transcript,
          metrics,
          feedback: parsed.data,
          status: SessionStatus.COMPLETED,
          error: null,
        },
      });

      if (user.plan === Plan.FREE && session.status !== SessionStatus.COMPLETED) {
        await tx.user.update({
          where: { id: user.id },
          data: { lifetimeSessionsUsed: { increment: 1 } },
        });
      }

      return updatedSession;
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('[analyze]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      if (body?.sessionId) {
        await prisma.speechSession.update({ where: { id: body.sessionId }, data: { status: SessionStatus.FAILED, error: message } });
      }
    } catch (_) {
      // best effort
    }
    return NextResponse.json({ error: 'Unable to analyze session', message }, { status: 500 });
  }
}
