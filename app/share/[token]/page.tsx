import { notFound } from 'next/navigation';
import { RecordingMetrics } from '@/components/recording-metrics';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { TipsList } from '@/components/tips-list';
import { prisma } from '@/src/server/db';

export default async function SharedRecordingPage({ params }: { params: { token: string } }) {
  const share = await prisma.shareToken.findUnique({
    where: { token: params.token },
    include: {
      recording: {
        include: { metrics: true, tips: { orderBy: { priority: 'asc' } } }
      }
    }
  });

  if (!share || !share.recording) notFound();
  const { recording } = share;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-wide text-primary">Shared via SmartSpeak</p>
        <h1 className="text-3xl font-semibold">{recording.title}</h1>
        <p className="text-muted-foreground">Recorded on {recording.createdAt.toLocaleDateString()}</p>
      </div>

      {recording.metrics ? <RecordingMetrics metrics={recording.metrics} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
        <TranscriptViewer transcript={recording.transcript} metrics={recording.metrics} />
        <TipsList tips={recording.tips} />
      </div>
    </div>
  );
}
