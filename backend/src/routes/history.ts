import { Router } from "express";
import { prisma } from "../db/client";
import type { HistoryResponse } from "../types/api";

export const historyRouter = Router();

historyRouter.get("/history", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }

    const analyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const payload: HistoryResponse = {
      items: analyses.map((analysis) => ({
        id: analysis.id,
        userId: analysis.userId,
        transcript: analysis.transcript,
        metrics: analysis.metrics as any,
        suggestions: analysis.suggestions as any,
        createdAt: analysis.createdAt.toISOString(),
      })),
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
