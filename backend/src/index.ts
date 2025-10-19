import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5001);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SmartSpeak backend is running" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
