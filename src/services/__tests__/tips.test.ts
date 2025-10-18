import { Metrics } from '@prisma/client';
import { generateTips } from '@/src/services/tips';

const baseMetrics: Metrics = {
  id: 'm1',
  recordingId: 'r1',
  wpm: 130,
  wpmStdDev: 12,
  fillerCount: 6,
  fillerRate: 1.5,
  avgPauseMs: 400,
  clarityScore: 72,
  readability: 65,
  fillersJson: [],
  pausesJson: [],
  createdAt: new Date()
};

describe('generateTips', () => {
  it('recommends filler techniques when rate is high', () => {
    const tips = generateTips({ ...baseMetrics, fillerRate: 3 });
    expect(tips.some((tip) => tip.category === 'Filler')).toBe(true);
  });

  it('flags fast monotone delivery', () => {
    const tips = generateTips({ ...baseMetrics, wpm: 170, wpmStdDev: 5 });
    expect(tips.find((tip) => tip.category === 'Pace')).toBeTruthy();
  });

  it('suggests pauses when avg pause is short', () => {
    const tips = generateTips({ ...baseMetrics, avgPauseMs: 200 });
    expect(tips.find((tip) => tip.category === 'Delivery')).toBeTruthy();
  });

  it('encourages mic adjustments for low clarity', () => {
    const tips = generateTips({ ...baseMetrics, clarityScore: 40 });
    expect(tips.find((tip) => tip.category === 'Clarity')).toBeTruthy();
  });

  it('returns a motivational tip when metrics are strong', () => {
    const tips = generateTips({ ...baseMetrics });
    expect(tips.length).toBeGreaterThan(0);
  });
});
