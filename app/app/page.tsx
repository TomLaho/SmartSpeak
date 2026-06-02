import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { remainingSessions } from '@/lib/plan';
import { Progress } from '@/components/ui/progress';

export default async function DashboardPage() {
  const authUser = await currentUser();
  if (!authUser) return null;
  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.emailAddresses[0]?.emailAddress || 'unknown',
    },
  });

  const sessions = await prisma.speechSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const averages = sessions.reduce(
    (acc, s) => {
      const metrics = (s.metrics as any) || {};
      if (metrics.wordsPerMinute) {
        acc.totalWpm += metrics.wordsPerMinute;
        acc.countWpm += 1;
      }
      if (metrics.fillerCounts?.perMinute) {
        acc.totalFillers += metrics.fillerCounts.perMinute;
        acc.countFillers += 1;
      }
      return acc;
    },
    { totalWpm: 0, countWpm: 0, totalFillers: 0, countFillers: 0 }
  );

  const avgWpm = averages.countWpm ? Math.round(averages.totalWpm / averages.countWpm) : 0;
  const avgFillers = averages.countFillers ? averages.totalFillers / averages.countFillers : 0;

  const remaining = remainingSessions(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Track your speaking progress and start a new practice.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/app/practice">Start Practice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/history">View History</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Your current subscription status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{user.plan}</p>
              {user.plan === 'FREE' ? (
                <p className="text-sm text-muted-foreground">Upgrade for unlimited sessions.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Unlimited sessions enabled.</p>
              )}
            </div>
            {user.plan === 'FREE' && (
              <Button asChild size="sm">
                <Link href="/app/billing">Upgrade</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Free plan allows 3 lifetime sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Sessions used</span>
              <span>{user.lifetimeSessionsUsed}/3</span>
            </div>
            <Progress value={Math.min(100, (user.lifetimeSessionsUsed / 3) * 100)} className="mt-2" />
            {user.plan === 'FREE' && (
              <p className="mt-2 text-xs text-muted-foreground">{remaining} sessions remaining</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent averages</CardTitle>
            <CardDescription>Based on your last sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Average WPM</p>
            <p className="text-2xl font-semibold">{avgWpm || '—'}</p>
            <p className="mt-3 text-sm text-muted-foreground">Average fillers per min</p>
            <p className="text-2xl font-semibold">{avgFillers ? avgFillers.toFixed(2) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
          <CardDescription>Your last 5 practice runs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {sessions.length === 0 && <p className="text-muted-foreground">No sessions yet. Start your first practice.</p>}
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(session.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{session.mode}</Badge>
                  <Badge variant={session.status === 'COMPLETED' ? 'default' : 'outline'}>{session.status}</Badge>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/app/session/${session.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
