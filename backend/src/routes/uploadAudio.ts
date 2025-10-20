import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/transcriptionService";
import type { UploadAudioResponse } from "../types/api";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadAudioRouter = Router();

uploadAudioRouter.post("/upload-audio", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);
    const payload: UploadAudioResponse = { transcript };
    res.json(payload);
  } catch (error) {
    console.error("Upload audio failed", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});
