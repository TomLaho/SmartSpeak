import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (!buffer.length) {
    throw new Error("Empty audio buffer");
  }

  if (!openaiClient) {
    return "This is a sample transcript generated locally because Whisper is not configured.";
  }

  const extension = mimeType?.split("/")[1] || "webm";
  const tempFilePath = path.join(os.tmpdir(), `smartspeak-${randomUUID()}.${extension}`);

  try {
    await fs.promises.writeFile(tempFilePath, buffer);
    const response = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    if (response.text) {
      return response.text;
    }

    throw new Error("Whisper did not return a transcript");
  } catch (error) {
    console.error("OpenAI transcription failed", error);
    return "Unable to transcribe audio. Please try again.";
  } finally {
    void fs.promises.unlink(tempFilePath).catch(() => undefined);
  }
}
