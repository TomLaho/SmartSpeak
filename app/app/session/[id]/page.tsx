import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/db';
import { createDownloadUrl } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default async function SessionDetail({ params }: { params: { id: string } }) {
  const authUser = await currentUser();
  if (!authUser) return null;
  const session = await prisma.speechSession.findUnique({ where: { id: params.id } });
  if (!session || session.userId !== authUser.id) return notFound();

  const audioUrl = await createDownloadUrl(session.audioKey);
  const metrics = (session.metrics as any) || {};
  const feedback = (session.feedback as any) || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Session</p>
          <h1 className="text-3xl font-bold">{session.title}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(session.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{session.mode}</Badge>
          <Badge variant={session.status === 'COMPLETED' ? 'default' : 'outline'}>{session.status}</Badge>
          <Button asChild variant="outline" size="sm">
            <a href="/app/practice">New session</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>SmartSpeak Score</CardTitle>
            <CardDescription>Composite score</CardDescription>
          </CardHeader>
          <CardContent className="text-4xl font-semibold">{metrics.smartSpeakScore ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Words per minute</CardTitle>
            <CardDescription>Estimated pace</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.wordsPerMinute ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Filler per minute</CardTitle>
            <CardDescription>Lower is better</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.fillerCounts?.perMinute ?? '—'}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Audio</CardTitle>
            <CardDescription>Private playback via signed URL.</CardDescription>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full" src={audioUrl} />
            {session.durationSeconds && (
              <p className="mt-2 text-xs text-muted-foreground">Duration: {Math.round(session.durationSeconds)}s</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structure</CardTitle>
            <CardDescription>Sentence and signposting stats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Avg sentence length: {metrics.sentenceStats?.avgSentenceLength ?? '—'} words</p>
            <p>Long sentence ratio: {metrics.sentenceStats?.longSentenceRatio ?? '—'}</p>
            <p>Structure score: {metrics.structureProxy?.score ?? '—'}</p>
            <p>Signposts: {(metrics.structureProxy?.signpostHits || []).join(', ') || 'None detected'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>Edit transcript in Practice before re-analyzing.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">{session.transcript || 'No transcript yet.'}</pre>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>Structured AI coaching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Strengths</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {(feedback.strengths || []).map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Improvements</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {(feedback.improvements || []).map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Quick wins</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {(feedback.quickWins || []).map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perspective</CardTitle>
            <CardDescription>Targeted notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Pace:</span> {feedback.paceFeedback || '—'}</p>
            <p><span className="font-semibold text-foreground">Clarity:</span> {feedback.clarityFeedback || '—'}</p>
            <p><span className="font-semibold text-foreground">Structure:</span> {feedback.structureFeedback || '—'}</p>
            <p><span className="font-semibold text-foreground">Confidence:</span> {feedback.confidenceFeedback || '—'}</p>
            <p><span className="font-semibold text-foreground">Summary:</span> {feedback.overallSummary || '—'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
