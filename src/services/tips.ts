import { Metrics } from '@prisma/client';

export interface TipPayload {
  recordingId?: string;
  category: 'Pace' | 'Filler' | 'Clarity' | 'Delivery';
  text: string;
  priority: number;
}

export function generateTips(metrics: Metrics): TipPayload[] {
  const tips: TipPayload[] = [];

  if (metrics.fillerRate > 2) {
    tips.push(
      {
        category: 'Filler',
        text: 'Practice one breath before key points to replace filler words with calm pauses.',
        priority: 1
      },
      {
        category: 'Filler',
        text: 'Script your transitions to remove “um” when moving between topics.',
        priority: 2
      }
    );
  }

  if (metrics.wpm > 160 && metrics.wpmStdDev < 10) {
    tips.push({
      category: 'Pace',
      text: 'Add planned rhetorical questions to reset your speed and voice tone.',
      priority: 1
    });
  } else if (metrics.wpm < 110) {
    tips.push({
      category: 'Pace',
      text: 'Mark emphasis words in your outline to lift energy and pace.',
      priority: 2
    });
  }

  if (metrics.avgPauseMs < 300) {
    tips.push({
      category: 'Delivery',
      text: 'Hold a full 1-beat pause at paragraph endings to let ideas land.',
      priority: 1
    });
  }

  if (metrics.clarityScore < 60) {
    tips.push({
      category: 'Clarity',
      text: 'Check mic distance and remove background fans before recording.',
      priority: 1
    });
  }

  if (metrics.readability < 60) {
    tips.push({
      category: 'Delivery',
      text: 'Shorten long sentences in your script for easier listening.',
      priority: 2
    });
  }

  if (tips.length === 0) {
    tips.push({
      category: 'Delivery',
      text: 'Strong session! Repeat the run and focus on storytelling details next.',
      priority: 3
    });
  }

  return tips.map((tip, index) => ({ ...tip, priority: tip.priority ?? index + 1 }));
}
