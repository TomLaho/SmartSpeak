"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchHistory } from "@/lib/api";
import { useLocalUser } from "@/lib/hooks/useLocalUser";
import type { HistoryEntry } from "@/types/api";

export default function HistoryPage() {
  const { userId } = useLocalUser();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchHistory(userId)
      .then((data) => {
        if (!active) return;
        setItems(data);
      })
      .catch(() => {
        if (!active) return;
        setError("We couldn't load your history. Try again later.");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Speech history</h1>
        <p className="text-muted-foreground">Review past coaching sessions and track your progress over time.</p>
      </div>

      {!userId ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to see history</CardTitle>
            <CardDescription>Add your user id or email from the header to save and retrieve sessions.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your recent analyses</CardTitle>
            <CardDescription>
              {isLoading ? "Fetching data…" : `You have ${items.length} recorded session${items.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            {!error && items.length === 0 && !isLoading && (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <p>No analyses yet.</p>
                <Button asChild variant="secondary">
                  <Link href="/">Run your first analysis</Link>
                </Button>
              </div>
            )}
            {!error && items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Words per minute</TableHead>
                    <TableHead>Clarity</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Filler words</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{item.metrics.wordsPerMinute}</TableCell>
                      <TableCell>{Math.round(item.metrics.clarity * 100)}%</TableCell>
                      <TableCell className="capitalize">{item.metrics.energy}</TableCell>
                      <TableCell>
                        {Object.values(item.metrics.fillerWordCounts).reduce((total, count) => total + count, 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
