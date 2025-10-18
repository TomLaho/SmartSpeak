import { Metrics } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptViewerProps {
  transcript: string;
  metrics: Metrics | null;
}

const fillerWords = ['um', 'uh', 'like', 'you know', 'sort of'];

export function TranscriptViewer({ transcript, metrics }: TranscriptViewerProps) {
  if (!transcript) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Transcript will appear after analysis completes.</p>
        </CardContent>
      </Card>
    );
  }

  const words = transcript.split(/(\s+)/);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="leading-7 text-muted-foreground">
          {words.map((word, index) => {
            const cleaned = word.trim().toLowerCase();
            if (fillerWords.includes(cleaned)) {
              return (
                <span key={index} className="rounded bg-amber-200/70 px-1 py-0.5 text-amber-900">
                  {word}
                </span>
              );
            }
            return <span key={index}>{word}</span>;
          })}
        </p>
        {Array.isArray(metrics?.pausesJson) && (
          <div>
            <h3 className="text-sm font-medium">Detected pauses</h3>
            <p className="text-sm text-muted-foreground">
              {(metrics!.pausesJson as Array<{ start: number; end: number }> | null)
                ?.map((pause) => `${pause.start.toFixed(1)}s–${pause.end.toFixed(1)}s`)
                .join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
