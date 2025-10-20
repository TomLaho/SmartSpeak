import { analyzeTranscript, getFallbackAnalysis, getFillerCounts } from "../services/analysisService";

const sampleTranscript = "Um hello everyone uh thank you for coming to my talk about focus and like productivity.";

describe("analysisService", () => {
  it("computes filler counts deterministically", () => {
    const counts = getFillerCounts(sampleTranscript);
    expect(counts.um).toBeGreaterThan(0);
    expect(counts["you know"]).toBe(0);
  });

  it("provides fallback analysis without OpenAI", async () => {
    const result = await analyzeTranscript(sampleTranscript);
    expect(result.metrics.wordsPerMinute).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("generates consistent fallback metrics", () => {
    const first = getFallbackAnalysis(sampleTranscript);
    const second = getFallbackAnalysis(sampleTranscript);
    expect(first.metrics.wordsPerMinute).toEqual(second.metrics.wordsPerMinute);
    expect(first.metrics.fillerWordCounts.um).toEqual(second.metrics.fillerWordCounts.um);
  });
});
