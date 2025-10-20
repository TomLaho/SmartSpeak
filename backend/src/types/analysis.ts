export interface SpeakingMetrics {
  wordsPerMinute: number;
  paceVariability: number;
  fillerWordCounts: Record<string, number>;
  sentiment: "negative" | "neutral" | "positive";
  energy: "low" | "medium" | "high";
  clarity: number; // 0-1
  organisation: number; // 0-1
}

export interface AnalysisSuggestion {
  title: string;
  detail: string;
}

export interface AnalysisResponse {
  transcript: string;
  metrics: SpeakingMetrics;
  suggestions: AnalysisSuggestion[];
}

export interface HistoryEntry extends AnalysisResponse {
  id: string;
  createdAt: string;
  userId: string;
}
