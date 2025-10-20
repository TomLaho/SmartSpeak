import type { AnalysisResponse, HistoryEntry, HistoryResponse, UploadAudioResponse } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

export async function uploadSpeechFile(file: File): Promise<UploadAudioResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(resolveUrl("/api/upload-audio"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return (await response.json()) as UploadAudioResponse;
}

export async function analyzeTranscriptRequest(transcript: string, userId?: string): Promise<AnalysisResponse> {
  const response = await fetch(resolveUrl("/api/analyze"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript, userId }),
  });

  if (!response.ok) {
    throw new Error("Analysis failed");
  }

  return (await response.json()) as AnalysisResponse;
}

export async function fetchHistory(userId: string): Promise<HistoryEntry[]> {
  const response = await fetch(resolveUrl(`/api/history?userId=${encodeURIComponent(userId)}`));

  if (!response.ok) {
    throw new Error("History request failed");
  }

  const payload = (await response.json()) as HistoryResponse;
  return payload.items;
}
