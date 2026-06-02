import 'dotenv/config';
import { Queue, Worker, JobsOptions } from 'bullmq';
import { computeMetrics } from '../lib/metrics';
import { prisma } from '../lib/db';
import { getOpenAI, COACH_MODEL } from '../lib/openai';
import { SessionStatus } from '@prisma/client';

const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } };

export const analysisQueue = new Queue('analysis', connection);
// BullMQ v5 folded QueueScheduler's delayed/stalled-job handling into Worker,
// so a separate scheduler is no longer needed.

const worker = new Worker(
  'analysis',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const session = await prisma.speechSession.findUnique({ where: { id: sessionId } });
    if (!session?.transcript) throw new Error('Transcript missing');

    const metrics = computeMetrics(session.transcript, session.durationSeconds || undefined);

    const completion = await getOpenAI().chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: 'Provide concise JSON feedback for the transcript.' },
        { role: 'user', content: session.transcript },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const feedback = completion.choices[0]?.message?.content || '{}';

    await prisma.speechSession.update({
      where: { id: sessionId },
      data: {
        metrics,
        feedback: JSON.parse(feedback),
        status: SessionStatus.COMPLETED,
      },
    });

    return true;
  },
  connection
);

worker.on('completed', (job) => console.log('analysis complete', job.id));
worker.on('failed', (job, err) => console.error('analysis failed', job?.id, err));

export function enqueueAnalysis(sessionId: string, opts?: JobsOptions) {
  return analysisQueue.add('analyze', { sessionId }, opts);
}
