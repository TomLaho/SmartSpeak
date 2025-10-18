import { prisma } from '@/src/server/db';
import { generateTips } from '@/src/services/tips';

export interface AnalyzeResult {
  wpm: number;
  wpmStdDev: number;
  fillerCount: number;
  fillerRate: number;
  avgPauseMs: number;
  clarityScore: number;
  readability: number;
  transcript: string;
  fillers: Array<{ word: string; timestamps: number[] }>;
  pauses: Array<{ start: number; end: number }>;
}

export async function analyzeRecording(recordingId: string): Promise<AnalyzeResult> {
  const recording = await prisma.recording.findUnique({ where: { id: recordingId } });
  if (!recording) throw new Error('Recording not found');

  // Mocked analysis pipeline with deterministic pseudo-randomness
  const base = recording.durationSec / 60;
  const wpm = Math.round(110 + base * 8);
  const fillerCount = Math.max(0, Math.round(base * 3 - base));
  const fillerRate = Number((fillerCount / base || 0).toFixed(1));
  const avgPauseMs = Math.round(450 + (Math.random() - 0.5) * 100);
  const clarityScore = Number((70 + Math.random() * 15).toFixed(1));
  const readability = Number((65 + Math.random() * 10).toFixed(1));
  const wpmStdDev = Number((12 + Math.random() * 5).toFixed(1));

  const transcript =
    recording.transcript ||
    'This is a placeholder transcript. Replace with actual Whisper transcription when integrating the pipeline.';

  const fillers = [
    { word: 'um', timestamps: [12.4, 45.2, 88.1] },
    { word: 'like', timestamps: [34.3] }
  ];

  const pauses = [
    { start: 22.2, end: 23.0 },
    { start: 67.4, end: 68.2 }
  ];

  const metrics = await prisma.metrics.upsert({
    where: { recordingId },
    update: {
      wpm,
      wpmStdDev,
      fillerCount,
      fillerRate,
      avgPauseMs,
      clarityScore,
      readability,
      fillersJson: fillers,
      pausesJson: pauses
    },
    create: {
      recordingId,
      wpm,
      wpmStdDev,
      fillerCount,
      fillerRate,
      avgPauseMs,
      clarityScore,
      readability,
      fillersJson: fillers,
      pausesJson: pauses
    }
  });

  await prisma.tip.deleteMany({ where: { recordingId } });
  const tips = generateTips(metrics);
  await prisma.tip.createMany({ data: tips });

  await prisma.recording.update({
    where: { id: recordingId },
    data: { transcript, language: 'en' }
  });

  return {
    wpm,
    wpmStdDev,
    fillerCount,
    fillerRate,
    avgPauseMs,
    clarityScore,
    readability,
    transcript,
    fillers,
    pauses
  };
}
