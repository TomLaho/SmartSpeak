import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import { historyRouter } from "./routes/history";
import { uploadAudioRouter } from "./routes/uploadAudio";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ message: "SmartSpeak backend is running" });
});

app.use("/api", uploadAudioRouter);
app.use("/api", analyzeRouter);
app.use("/api", historyRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
