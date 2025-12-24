import type {
  AnalysisResponse,
  HistoryEntry,
  HistoryResponse,
  PresignUploadResponse,
  TranscribeResponse,
  UploadAudioResponse,
} from "@/types/api";

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

/**
 * Requests a presigned URL for uploading audio to S3/R2 (or in-memory dev storage).
 */
export async function createUploadTarget(contentType: string, authToken?: string): Promise<PresignUploadResponse> {
  const response = await fetch(resolveUrl("/api/uploads/presign"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ contentType }),
  });

  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "Unable to prepare upload target");
  }

  return (await response.json()) as PresignUploadResponse;
}

export async function uploadToTarget(uploadUrl: string, file: File): Promise<void> {
  const targetUrl = uploadUrl.startsWith("http") ? uploadUrl : resolveUrl(uploadUrl);
  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload audio to storage");
  }
}

/**
 * Tells the backend to fetch audio by key, run Whisper, and persist the transcript.
 */
export async function transcribeStoredAudio(storageKey: string, userId?: string, authToken?: string): Promise<TranscribeResponse> {
  const response = await fetch(resolveUrl("/api/transcribe"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(userId ? { "x-user-id": userId } : {}),
    },
    body: JSON.stringify({ storageKey, userId }),
  });

  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "Unable to transcribe audio");
  }

  return (await response.json()) as TranscribeResponse;
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
