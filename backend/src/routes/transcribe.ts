import { Router } from "express";
import { prisma } from "../db/client";
import { retrieveAudio } from "../services/storageService";
import { transcribeAudio } from "../services/transcriptionService";
import { resolveUserId } from "../utils/auth";
import type { TranscribeRequestBody, TranscribeResponse } from "../types/api";

export const transcribeRouter = Router();

transcribeRouter.post("/transcribe", async (req, res) => {
  try {
    const { storageKey, userId: providedUserId } = req.body as TranscribeRequestBody;
    if (!storageKey || typeof storageKey !== "string") {
      return res.status(400).json({ error: "storageKey is required" });
    }

    const userId = resolveUserId(req, providedUserId);
    const audio = await retrieveAudio(storageKey);
    const transcript = await transcribeAudio(audio.buffer, audio.contentType);

    const record = await prisma.transcript.create({
      data: {
        userId,
        storageKey,
        transcript,
      },
    });

    const payload: TranscribeResponse = {
      id: record.id,
      transcript: record.transcript,
      createdAt: record.createdAt.toISOString(),
      userId: record.userId ?? undefined,
      storageKey: record.storageKey,
      storageMode: audio.mode,
      location: audio.location,
    };

    res.json(payload);
  } catch (error) {
    console.error("Transcription endpoint failed", error);
    res.status(500).json({ error: "Unable to transcribe audio" });
  }
});
