import { Router } from "express";
import { prisma } from "../db/client";
import type { HistoryResponse } from "../types/api";
import type { AnalysisSuggestion, SpeakingMetrics } from "../types/analysis";

const DEFAULT_METRICS: SpeakingMetrics = {
  wordsPerMinute: 0,
  paceVariability: 0,
  fillerWordCounts: {},
  sentiment: "neutral",
  energy: "medium",
  clarity: 0,
  organisation: 0,
};

const safeParseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Failed to parse JSON column", error);
    return fallback;
  }
import type { HistoryEntry } from "../types/analysis";

type StoredAnalysis = {
  id: string;
  userId: string;
  transcript: string;
  metrics: unknown;
  suggestions: unknown;
  createdAt: Date;
};

export const historyRouter = Router();

historyRouter.get("/history", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }

    const analyses = (await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })) as StoredAnalysis[];

    const payload: HistoryResponse = {
      items: analyses.map((analysis) => ({
        id: analysis.id,
        userId: analysis.userId,
        transcript: analysis.transcript,
        metrics: safeParseJson<SpeakingMetrics>(analysis.metrics, DEFAULT_METRICS),
        suggestions: safeParseJson<AnalysisSuggestion[]>(analysis.suggestions, []),
        metrics: analysis.metrics as HistoryEntry["metrics"],
        suggestions: analysis.suggestions as HistoryEntry["suggestions"],
        createdAt: analysis.createdAt.toISOString(),
      } satisfies HistoryEntry)),
    };

    res.json(payload);
  } catch (error) {
    console.error("History endpoint failed", error);
    if (process.env.NODE_ENV !== "production") {
      const payload: HistoryResponse = {
        items: [
          {
            id: "dev-sample",
            userId: typeof req.query.userId === "string" ? req.query.userId : "demo-user",
            transcript:
              "Thank you all for being here today. I'm excited to share a few ideas on staying confident in high-pressure moments.",
            metrics: {
              wordsPerMinute: 132,
              paceVariability: 0.32,
              fillerWordCounts: { um: 3, uh: 1, like: 0, "you know": 0, actually: 0, basically: 0 },
              sentiment: "positive",
              energy: "medium",
              clarity: 0.78,
              organisation: 0.81,
            },
            suggestions: [
              {
                title: "Slow down transitions",
                detail: "Give the audience a beat between sections so they can process each idea.",
              },
              {
                title: "Celebrate your wins",
                detail: "Your tone is encouraging—add a brief story to make the takeaway stick.",
              },
            ],
            createdAt: new Date().toISOString(),
          },
        ],
      };
      return res.json(payload);
    }
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
