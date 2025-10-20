import type { AnalysisResponse, HistoryEntry } from "./analysis";

export interface UploadAudioResponse {
  transcript: string;
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
