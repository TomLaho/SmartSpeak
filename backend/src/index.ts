import "dotenv/config";
import cors from "cors";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import { historyRouter } from "./routes/history";
import { uploadAudioRouter } from "./routes/uploadAudio";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health route should NOT touch Prisma; it must succeed even if DB is down.
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    backend: "online",
    time: new Date().toISOString(),
  });
});

app.use("/api", uploadAudioRouter);
app.use("/api", analyzeRouter);
app.use("/api", historyRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0"; // be friendly with Windows/IPv6

app.listen(PORT, HOST, () => {
  console.log(`[backend] Listening on http://${HOST}:${PORT}`);
});
