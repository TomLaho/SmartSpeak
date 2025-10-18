import { Metrics } from '@prisma/client';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toFixed } from '@/src/lib/utils';

interface RecordingMetricsProps {
  metrics: Metrics;
}

const metricItems: Array<{ key: keyof Metrics; label: string; digits?: number }> = [
  { key: 'wpm', label: 'Words per minute', digits: 0 },
  { key: 'fillerCount', label: 'Filler words', digits: 0 },
  { key: 'fillerRate', label: 'Fillers / min', digits: 1 },
  { key: 'avgPauseMs', label: 'Average pause (ms)', digits: 0 },
  { key: 'clarityScore', label: 'Clarity score', digits: 1 },
  { key: 'readability', label: 'Readability', digits: 1 }
];

export function RecordingMetrics({ metrics }: RecordingMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metricItems.map((item) => {
        const value = metrics[item.key];
        const formatted = typeof value === 'number' ? toFixed(value, item.digits) : String(value ?? '—');
        return (
          <Card key={item.key}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{formatted}</CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
