import { Tip } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TipsListProps {
  tips: Tip[];
}

export function TipsList({ tips }: TipsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalized Tips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Run an analysis to receive tailored recommendations.</p>
        ) : (
          tips
            .sort((a, b) => a.priority - b.priority)
            .map((tip) => (
              <div key={tip.id} className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase text-primary">{tip.category}</p>
                <p className="text-sm text-muted-foreground">{tip.text}</p>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
