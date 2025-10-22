import OpenAI from "openai";
import type { AnalysisResponse, AnalysisSuggestion, SpeakingMetrics } from "../types/analysis";

const fillerWords = ["um", "uh", "like", "you know", "actually", "basically"];

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

/**
 * Roughly estimates the words per minute based on transcript length.
 */
function calculateWordsPerMinute(transcript: string): number {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const assumedDurationMinutes = Math.max(1, transcript.length / 750); // heuristic
  return Math.round(words / assumedDurationMinutes);
}

/**
 * Counts common filler words in the transcript, normalising spacing.
 */
function calculateFillerCounts(transcript: string): Record<string, number> {
  const lowerTranscript = transcript.toLowerCase();
  const counts: Record<string, number> = {};
  fillerWords.forEach((word) => {
    const pattern = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = lowerTranscript.match(pattern);
    counts[word] = matches ? matches.length : 0;
  });
  return counts;
}

/**
 * Generates deterministic fallback metrics when OpenAI is unavailable.
 */
function buildFallbackAnalysis(transcript: string): AnalysisResponse {
  const fillerCounts = calculateFillerCounts(transcript);
  const fillerTotal = Object.values(fillerCounts).reduce((acc, val) => acc + val, 0);
  const clarity = Math.max(0.4, 1 - fillerTotal * 0.03);
  const organisation = Math.max(0.5, 1 - fillerTotal * 0.02);
  const metrics: SpeakingMetrics = {
    wordsPerMinute: calculateWordsPerMinute(transcript),
    paceVariability: Number((0.2 + Math.min(0.8, fillerTotal * 0.05)).toFixed(2)),
    fillerWordCounts: fillerCounts,
    sentiment: fillerTotal > 5 ? "neutral" : "positive",
    energy: fillerTotal > 8 ? "medium" : "high",
    clarity: Number(clarity.toFixed(2)),
    organisation: Number(organisation.toFixed(2)),
  };

  const suggestions: AnalysisSuggestion[] = [
    {
      title: "Reduce filler words",
      detail:
        "Practice pausing between ideas instead of filling the silence with words like 'um' or 'like'.",
    },
    {
      title: "Strengthen your structure",
      detail: "Outline your key points and transitions to maintain clear organisation throughout the talk.",
    },
  ];

  return { transcript, metrics, suggestions };
}

/**
 * Analyses a transcript using OpenAI when available, or the fallback model otherwise.
 */
export async function analyzeTranscript(transcript: string): Promise<AnalysisResponse> {
  if (!transcript.trim()) {
    throw new Error("Transcript must not be empty");
  }

  if (!openaiClient) {
    return buildFallbackAnalysis(transcript);
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert speaking coach. Analyse the transcript and return JSON with metrics and suggestions.",
        },
        {
          role: "user",
          content: `Transcript: ${transcript}\nProvide metrics with keys wordsPerMinute, paceVariability (0-1), fillerWordCounts (object), sentiment (negative|neutral|positive), energy (low|medium|high), clarity (0-1), organisation (0-1) and suggestions (array of {title, detail}).`,
        },
      ],
    });

    const message = completion.choices[0]?.message?.content;
    if (!message) {
      throw new Error("No analysis returned from OpenAI");
    }

    const parsed: AnalysisResponse = JSON.parse(message);
    return parsed;
  } catch (error) {
    console.error("OpenAI analysis failed", error);
    return buildFallbackAnalysis(transcript);
  }
}

export function getFallbackAnalysis(transcript: string): AnalysisResponse {
  return buildFallbackAnalysis(transcript);
}

/**
 * Returns the filler word counts for a transcript.
 */
export function getFillerCounts(transcript: string): Record<string, number> {
  return calculateFillerCounts(transcript);
}
