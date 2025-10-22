import type { AnalysisResponse, HistoryEntry, HistoryResponse, UploadAudioResponse } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

/**
 * Uploads an audio/video file so the backend can generate a transcript.
 * @throws {Error} when the server responds with a non-2xx status code.
 */
export async function uploadSpeechFile(file: File): Promise<UploadAudioResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(resolveUrl("/api/upload-audio"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "Upload failed. Try a smaller file or convert it to MP3/WAV.");
  }

  return (await response.json()) as UploadAudioResponse;
}

/**
 * Sends a transcript to the backend for SmartSpeak analysis.
 */
export async function analyzeTranscriptRequest(transcript: string, userId?: string): Promise<AnalysisResponse> {
  const response = await fetch(resolveUrl("/api/analyze"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript, userId }),
  });

  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "Analysis failed. Please retry in a few moments.");
  }

  return (await response.json()) as AnalysisResponse;
}

/**
 * Retrieves historical SmartSpeak analyses for the provided user.
 */
export async function fetchHistory(userId: string): Promise<HistoryEntry[]> {
  const response = await fetch(resolveUrl(`/api/history?userId=${encodeURIComponent(userId)}`));

  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "History request failed");
  }

  const payload = (await response.json()) as HistoryResponse;
  return payload.items;
}

async function safeParseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error;
  } catch (error) {
    console.warn("Failed to parse error response", error);
    return undefined;
  }
}
