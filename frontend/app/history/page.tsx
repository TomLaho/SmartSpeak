"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHistory } from "@/lib/api";
import { useLocalUser } from "@/lib/hooks/useLocalUser";
import type { HistoryEntry } from "@/types/api";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const { userId } = useLocalUser();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(userId);
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
      setError(
        "We couldn't load your previous sessions. Check your connection and try again in a moment.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const fillerTotals = useMemo(() => {
    return items.map((item) =>
      Object.values(item.metrics.fillerWordCounts).reduce((total, count) => total + count, 0),
    );
  }, [items]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="space-y-4 animate-fade-up" style={{ "--fade-delay": "0s" } as CSSProperties}>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <History className="h-3.5 w-3.5" aria-hidden /> Progress tracker
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Speech history</h1>
          <p className="max-w-3xl text-muted-foreground">
            Review past coaching sessions, compare key delivery metrics, and spot trends in your speaking performance over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>

      {!userId ? (
        <Card className="border-none bg-card/80 shadow-elevated backdrop-blur">
          <CardHeader>
            <CardTitle>Save your progress</CardTitle>
            <CardDescription>
              Add your email or user ID in the header to store new analyses and build a personalised progress timeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <Link href="/">
                <Sparkles className="h-4 w-4" aria-hidden /> Run an analysis to get started
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none bg-card/85 shadow-elevated backdrop-blur">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Your recent analyses</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Fetching your sessions…"
                  : items.length === 0
                    ? "No recorded sessions yet. Run an analysis to populate this view."
                    : "These sessions are stored locally for quick reference."
                }
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                {items.length} session{items.length === 1 ? "" : "s"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadHistory()}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin") } aria-hidden /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {isLoading ? (
              <HistorySkeleton />
            ) : items.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
                <p>No analyses yet. New sessions appear here automatically.</p>
                <Button asChild variant="secondary" className="w-fit gap-2">
                  <Link href="/">
                    <Sparkles className="h-4 w-4" aria-hidden /> Run your first analysis
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Words per minute</TableHead>
                    <TableHead>Clarity</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead className="text-right">Filler words</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className="transition hover:bg-muted/40">
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{item.metrics.wordsPerMinute}</TableCell>
                      <TableCell>{Math.round(item.metrics.clarity * 100)}%</TableCell>
                      <TableCell className="capitalize">{item.metrics.energy}</TableCell>
                      <TableCell className="text-right">{fillerTotals[index]}</TableCell>
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

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`history-skeleton-${index}`} className="grid grid-cols-5 gap-4">
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
