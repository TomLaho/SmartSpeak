import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default async function HistoryPage() {
  const authUser = await currentUser();
  if (!authUser) return null;
  const sessions = await prisma.speechSession.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>History</CardTitle>
          <CardDescription>All your recorded practice sessions.</CardDescription>
        </div>
        <Link href="/app/practice" className="text-sm font-medium text-primary hover:underline">
          Start new session
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const metrics = (s.metrics as any) || {};
              return (
                <TableRow key={s.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/app/session/${s.id}`} className="hover:underline">
                      {s.title}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.mode}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'COMPLETED' ? 'default' : 'outline'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>{metrics.smartSpeakScore ? Math.round(metrics.smartSpeakScore) : '—'}</TableCell>
                </TableRow>
              );
            })}
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
