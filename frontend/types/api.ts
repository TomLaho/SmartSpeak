export interface SpeakingMetrics {
  wordsPerMinute: number;
  paceVariability: number;
  fillerWordCounts: Record<string, number>;
  sentiment: "negative" | "neutral" | "positive";
  energy: "low" | "medium" | "high";
  clarity: number;
  organisation: number;
}

export interface AnalysisSuggestion {
  title: string;
  detail: string;
}

export interface AnalysisResponse {
  transcript: string;
  metrics: SpeakingMetrics;
  suggestions: AnalysisSuggestion[];
  id?: string;
}

export interface HistoryEntry extends AnalysisResponse {
  id: string;
  userId: string;
  createdAt: string;
}

export interface HistoryResponse {
  items: HistoryEntry[];
}

export interface UploadAudioResponse {
  transcript: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  storageKey: string;
  mode: "s3" | "memory";
  expiresIn: number;
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
