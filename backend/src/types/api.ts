import type { AnalysisResponse, HistoryEntry } from "./analysis";

export interface UploadAudioResponse {
  transcript: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  storageKey: string;
  mode: "s3" | "memory";
  expiresIn: number;
}

export interface AnalyzeRequestBody {
  transcript: string;
  userId?: string;
}

export interface AnalyzeResponse extends AnalysisResponse {
  id?: string;
}

export interface HistoryResponse {
  items: HistoryEntry[];
}

export interface TranscribeRequestBody {
  storageKey: string;
  userId?: string;
}

export interface TranscribeResponse {
  id: string;
  transcript: string;
  createdAt: string;
  userId?: string;
  storageKey: string;
  storageMode: "s3" | "memory";
  location: string;
}
