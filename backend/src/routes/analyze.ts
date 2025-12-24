import { Router } from "express";
import { prisma } from "../db/client";
import { analyzeTranscript } from "../services/analysisService";
import type { AnalyzeRequestBody, AnalyzeResponse } from "../types/api";
import { resolveUserId } from "../utils/auth";

export const analyzeRouter = Router();

analyzeRouter.post("/analyze", async (req, res) => {
  try {
    const { transcript, userId: providedUserId } = req.body as AnalyzeRequestBody;
    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const userId = resolveUserId(req, providedUserId);
    const analysis = await analyzeTranscript(transcript);
    let recordId: string | undefined;

    if (userId) {
      try {
        const record = await prisma.analysis.create({
          data: {
            userId,
            transcript,
            metrics: JSON.stringify(analysis.metrics),
            suggestions: JSON.stringify(analysis.suggestions),
          },
        });
        recordId = record.id;
      } catch (err) {
        console.error("Failed to persist analysis", err);
      }
    }

    const payload: AnalyzeResponse = {
      ...analysis,
      id: recordId,
    };

    res.json(payload);
  } catch (error) {
    console.error("Analyze endpoint failed", error);
    res.status(500).json({ error: "Failed to analyse transcript" });
  }
});
