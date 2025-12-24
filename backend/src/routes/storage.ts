import express, { Router } from "express";
import { createUploadTarget, getStorageMode, storeDevelopmentUpload } from "../services/storageService";

export const storageRouter = Router();

storageRouter.post("/uploads/presign", (req, res) => {
  try {
    const contentType =
      typeof req.body?.contentType === "string" && req.body.contentType.trim()
        ? (req.body.contentType as string)
        : "application/octet-stream";
    const target = createUploadTarget(contentType);
    res.json(target);
  } catch (error) {
    console.error("Failed to create upload target", error);
    res.status(500).json({ error: "Unable to prepare upload target" });
  }
});

storageRouter.put(
  "/uploads/dev/*",
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req, res) => {
    if (getStorageMode() !== "memory") {
      return res.status(404).json({ error: "Development storage is disabled" });
    }
    const key = req.params[0];
    if (!key) {
      return res.status(400).json({ error: "Upload key is required" });
    }
    try {
      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      const contentType = (req.header("content-type") as string) || "application/octet-stream";
      await storeDevelopmentUpload(key, bodyBuffer, contentType);
      res.json({ stored: true, key });
    } catch (error) {
      console.error("Development upload failed", error);
      res.status(500).json({ error: "Unable to store uploaded audio" });
    }
  },
);
