'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

interface ProgressDatum {
  id: string;
  title: string;
  createdAt: string;
  wpm: number;
  fillerRate: number;
  avgPauseMs: number;
  clarityScore: number;
}

interface ProgressTimelineProps {
  data: ProgressDatum[];
}

export function ProgressTimeline({ data }: ProgressTimelineProps) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Upload a recording to see your progress timeline.</p>;
  }

  const formatted = data.map((item) => ({
    ...item,
    createdLabel: new Date(item.createdAt).toLocaleDateString()
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="createdLabel" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
          labelClassName="font-medium"
        />
        <Legend />
        <Line type="monotone" dataKey="wpm" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="WPM" />
        <Line type="monotone" dataKey="fillerRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Fillers / min" />
        <Line type="monotone" dataKey="avgPauseMs" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Pause (ms)" />
        <Line type="monotone" dataKey="clarityScore" stroke="#22c55e" strokeWidth={2} dot={false} name="Clarity" />
      </LineChart>
    </ResponsiveContainer>
  );
}
