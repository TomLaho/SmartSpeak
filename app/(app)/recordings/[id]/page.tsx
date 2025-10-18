import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordingMetrics } from '@/components/recording-metrics';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { TipsList } from '@/components/tips-list';
import { ShareButton } from '@/components/share-button';
import { prisma } from '@/src/server/db';
import { getCurrentUser } from '@/src/server/user';

export default async function RecordingDetailsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const recording = await prisma.recording.findFirst({
    where: { id: params.id, userId: user.id },
    include: { metrics: true, tips: { orderBy: { priority: 'asc' } } }
  });

  if (!recording) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/app/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to dashboard
          </Link>
        </Button>
        <ShareButton recordingId={recording.id} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{recording.title}</h1>
        <p className="text-muted-foreground">Uploaded {recording.createdAt.toLocaleDateString()}</p>
      </div>

      {recording.metrics ? <RecordingMetrics metrics={recording.metrics} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
        <TranscriptViewer transcript={recording.transcript} metrics={recording.metrics} />
        <TipsList tips={recording.tips} />
      </div>
    </div>
  );
}
