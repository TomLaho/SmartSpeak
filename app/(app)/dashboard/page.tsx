import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressTimeline } from '@/components/charts/progress-timeline';
import { prisma } from '@/src/server/db';
import { getCurrentUser } from '@/src/server/user';
import { formatDuration, toFixed } from '@/src/lib/utils';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const recordings = await prisma.recording.findMany({
    where: { userId: user.id },
    include: { metrics: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const recent = recordings[0];
  const timeline = recordings
    .filter((item) => item.metrics)
    .map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt.toISOString(),
      wpm: item.metrics!.wpm,
      fillerRate: item.metrics!.fillerRate,
      avgPauseMs: item.metrics!.avgPauseMs,
      clarityScore: item.metrics!.clarityScore
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {user.name ?? user.email}</h1>
          <p className="text-muted-foreground">Review your recent sessions and track your speaking progress.</p>
        </div>
        <Button asChild>
          <Link href="/app/new">New session</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress timeline</CardTitle>
            <CardDescription>Metrics across your last ten sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressTimeline data={timeline} />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Latest session</CardTitle>
            <CardDescription>
              {recent ? `${recent.title} · ${formatDuration(recent.durationSec)}` : 'Upload a session to get started.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {recent?.metrics ? (
              <>
                <p>WPM: {recent.metrics.wpm}</p>
                <p>Fillers per minute: {toFixed(recent.metrics.fillerRate)}</p>
                <p>Average pause: {recent.metrics.avgPauseMs} ms</p>
                <p>Clarity score: {toFixed(recent.metrics.clarityScore)}</p>
                <Button variant="link" className="px-0" asChild>
                  <Link href={`/app/recordings/${recent.id}`}>View full report →</Link>
                </Button>
              </>
            ) : (
              <p>Run an analysis to view your detailed metrics and personalized tips.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent recordings</CardTitle>
          <CardDescription>Your most recent uploads and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recordings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recordings yet. Upload your first session to begin.</p>
            ) : (
              recordings.map((recording) => (
                <div key={recording.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{recording.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {recording.metrics ? 'Analyzed' : 'Awaiting analysis'} · {recording.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                      <Link href={`/app/recordings/${recording.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
