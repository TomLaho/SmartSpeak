"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  Mic,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeTranscriptRequest, uploadSpeechFile } from "@/lib/api";
import { useLocalUser } from "@/lib/hooks/useLocalUser";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/types/api";
import BackendStatus from "./BackendStatus";

type StatusStep = "idle" | "recording" | "uploading" | "transcribing" | "analyzing" | "complete" | "error";

interface StatusState {
  readonly step: StatusStep;
  readonly message: string;
  readonly progress: number;
}

const initialStatus: StatusState = {
  step: "idle",
  message: "Upload a file or record a new speech to begin.",
  progress: 0,
};

const statusHints: Record<StatusStep, string> = {
  idle: "Choose how you'd like to capture your speech to start a fresh coaching session.",
  recording: "Recording in progress. Speak clearly and project your voice toward the microphone.",
  uploading: "Uploading media… keep this tab open while we process the audio.",
  transcribing: "Transcribing your speech and preparing the text for analysis.",
  analyzing: "Analysing the transcript with SmartSpeak's coaching engine.",
  complete: "Great work! Review the insights below and iterate on your delivery.",
  error: "We couldn't process this attempt. Check your connection, then try a smaller file or paste the transcript directly.",
};

const heroHighlights = [
  "AI-crafted insights on pacing, clarity & energy",
  "Auto transcript with filler word detection",
  "Save sessions to track improvement trends",
];

export function SpeechAnalyzer() {
  const { userId } = useLocalUser();
  const [status, setStatus] = useState<StatusState>({ ...initialStatus });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }
    const start = Date.now();
    const timer = window.setInterval(() => {
      setRecordingDuration(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  const reset = useCallback(() => {
    setStatus({ ...initialStatus });
    setAnalysis(null);
    setTranscript("");
    setError(null);
    setSelectedFileName(null);
    setCopied(false);
  }, []);

  /**
   * Executes the SmartSpeak analysis for the provided transcript.
   * @param text - Transcript text that will be sent to the backend.
   */
  const runAnalysis = useCallback(
    async (text: string) => {
      setStatus({
        step: "analyzing",
        message: "Analysing transcript with SmartSpeak coach…",
        progress: 75,
      });
      try {
        const result = await analyzeTranscriptRequest(text, userId || undefined);
        setAnalysis(result);
        setTranscript(text);
        setStatus({ step: "complete", message: "Analysis complete", progress: 100 });
      } catch (err) {
        console.error(err);
        setError(
          "We couldn't analyse this transcript. Please check your connection or try pasting the text manually.",
        );
        setStatus({ step: "error", message: "Analysis failed", progress: 100 });
      }
    },
    [userId],
  );

  /**
   * Handles upload flow for audio or video files.
   * @param file - Media file to transcribe and analyse.
   */
  const handleFileUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      reset();
      setSelectedFileName(file.name);
      setStatus({ step: "uploading", message: `Uploading ${file.name}…`, progress: 15 });
      try {
        const upload = await uploadSpeechFile(file);
        setStatus({
          step: "transcribing",
          message: "Transcribing speech with Azure…",
          progress: 45,
        });
        await runAnalysis(upload.transcript);
      } catch (err) {
        console.error(err);
        setError("Upload failed. Try a smaller file, or convert it to MP3/WAV before uploading.");
        setStatus({ step: "error", message: "Upload failed", progress: 100 });
      }
    },
    [reset, runAnalysis],
  );

  /**
   * Sends a manually entered transcript for analysis.
   */
  const handleManualSubmit = useCallback(async () => {
    if (!manualTranscript.trim()) {
      setError("Enter a transcript before analysing. A short outline is a great place to start.");
      return;
    }
    setError(null);
    reset();
    await runAnalysis(manualTranscript.trim());
  }, [manualTranscript, reset, runAnalysis]);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setStatus({ step: "uploading", message: "Preparing recording for upload…", progress: 20 });
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], "recording.webm", { type: blob.type });
          void handleFileUpload(file);
        } else {
          setError("We couldn't capture audio. Please try again.");
          setStatus({ step: "error", message: "Recording failed", progress: 100 });
        }
      };
      recorder.start();
      setIsRecording(true);
      setStatus({
        step: "recording",
        message: "Recording… speak clearly into your microphone.",
        progress: 5,
      });
    } catch (err) {
      console.error(err);
      setError("Microphone access was denied. Allow access in your browser settings and try again.");
    }
  }, [handleFileUpload]);

  const handleStopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const handleCopyTranscript = useCallback(async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error(copyError);
      setError("We couldn't copy the transcript. Try using your browser's copy shortcut instead.");
    }
  }, [transcript]);

  const fillerWordTotal = useMemo(() => {
    if (!analysis) return 0;
    return Object.values(analysis.metrics.fillerWordCounts).reduce((total, count) => total + count, 0);
  }, [analysis]);

  const isProcessing =
    status.step !== "idle" && status.step !== "complete" && status.step !== "error";

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6 animate-fade-up" style={{ "--fade-delay": "0s" } as CSSProperties}>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Smart coaching assistant
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Deliver confident, polished talks with a real-time AI speech coach.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            SmartSpeak analyses your delivery, transcript, and tone to provide actionable, personalised coaching tips in seconds.
            Upload a recording or paste your script to get started.
          </p>
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {heroHighlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <Check className="mt-1 h-4 w-4 text-primary" aria-hidden />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="gap-2 shadow-glow"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-5 w-5" aria-hidden /> Upload speech
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              <Mic className="h-5 w-5" aria-hidden /> {isRecording ? "Stop recording" : "Record live"}
            </Button>
          </div>
        </div>
        <BackendStatus className="ml-auto w-full max-w-sm animate-fade-up lg:sticky lg:top-24" />
      </div>

      <Card className="border-none bg-card/80 shadow-elevated backdrop-blur">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Start a new analysis</CardTitle>
          <CardDescription>
            Choose how you want to capture your speech. We'll generate a transcript, surface pacing metrics, and craft targeted recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="flex flex-wrap gap-2 bg-muted/40 p-1">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" aria-hidden /> Upload file
              </TabsTrigger>
              <TabsTrigger value="record" className="flex items-center gap-2">
                <Mic className="h-4 w-4" aria-hidden /> Record live
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden /> Paste transcript
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-6 space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "group relative flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/70 bg-muted/30 text-center transition",
                  dragActive && "border-primary bg-primary/10",
                )}
              >
                <UploadCloud className="h-10 w-10 text-primary transition group-hover:scale-105" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your audio here, or <span className="text-primary">browse files</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Supports MP3, WAV, MP4, MOV, WebM up to 50MB.</p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                {selectedFileName && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
                    <span className="truncate max-w-[160px]" title={selectedFileName}>
                      {selectedFileName}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground transition hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedFileName(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">Remove file</span>
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="record" className="mt-6">
              <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-muted/20 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className={cn(
                      "relative gap-2 rounded-full px-6",
                      isRecording ? "bg-destructive text-destructive-foreground" : "",
                    )}
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                  >
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full bg-destructive",
                          isRecording ? "animate-[pulse-dot_1.4s_ease-in-out_infinite]" : "bg-primary",
                        )}
                      />
                    </span>
                    <Mic className="h-4 w-4" aria-hidden />
                    {isRecording ? "Stop recording" : "Start recording"}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" aria-hidden />
                    <span>{formatDuration(recordingDuration)}</span>
                  </div>
                </div>
                <div className="flex items-end gap-1" aria-hidden>
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span
                      key={`wave-${index}`}
                      className={cn(
                        "h-8 w-1 rounded-full bg-primary/40",
                        isRecording ? "animate-wave" : "",
                      )}
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ))}
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AudioLines className="h-4 w-4" aria-hidden />
                  Tip: Pause briefly between sections to reduce filler words and give the AI clearer cues.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="manual" className="mt-6 space-y-4">
              <Textarea
                placeholder="Paste your transcript here to get insights without uploading audio."
                rows={8}
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
                className="resize-none rounded-2xl border border-border/70 bg-muted/20"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void handleManualSubmit()} className="gap-2">
                  <Wand2 className="h-4 w-4" aria-hidden /> Analyse transcript
                </Button>
                {!userId && (
                  <p className="text-xs text-muted-foreground">
                    Add a user ID in the header to save this analysis to your history.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <Progress
              value={status.progress}
              className="h-2 overflow-hidden rounded-full bg-muted"
              indicatorClassName="bg-gradient-to-r from-primary via-accent to-primary"
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden /> : <Sparkles className="h-4 w-4 text-primary" aria-hidden />}
              <span>{status.message}</span>
            </div>
            <p className="text-xs text-muted-foreground">{statusHints[status.step]}</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3 border-t border-border/60 bg-muted/20 py-6">
          <Button variant="secondary" onClick={reset} className="gap-2">
            Reset session
          </Button>
          <p className="text-xs text-muted-foreground">
            SmartSpeak stores the last three analyses per user so you can track improvement over time.
          </p>
        </CardFooter>
      </Card>

      {isProcessing && <ProcessingSkeleton />}

      {analysis && status.step === "complete" && (
        <div className="grid gap-8 animate-fade-up" style={{ "--fade-delay": "0.2s" } as CSSProperties}>
          <Card className="border-none bg-card/85 shadow-elevated backdrop-blur">
            <CardHeader className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Transcript</CardTitle>
                <CardDescription>The text we analysed for this session.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleCopyTranscript()}
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />} {copied ? "Copied" : "Copy transcript"}
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea value={transcript} readOnly rows={8} className="resize-none rounded-2xl bg-muted/30" />
            </CardContent>
          </Card>

          <MetricsGrid analysis={analysis} fillerWordTotal={fillerWordTotal} />

          <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" aria-hidden /> Coaching suggestions
              </CardTitle>
              <CardDescription>Practical recommendations tailored to your delivery style.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {analysis.suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.title}
                  className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-elevated"
                  style={{ "--fade-delay": `${0.1 * index}s` } as CSSProperties}
                >
                  <p className="text-sm font-semibold text-primary">{suggestion.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{suggestion.detail}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="secondary" onClick={reset} className="gap-2">
                Start another analysis
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </section>
  );
}

interface MetricsGridProps {
  readonly analysis: AnalysisResponse;
  readonly fillerWordTotal: number;
}

function MetricsGrid({ analysis, fillerWordTotal }: MetricsGridProps) {
  const metrics = analysis.metrics;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Words per minute" value={`${metrics.wordsPerMinute} wpm`} accent="from-primary/30 to-primary/10" />
        <MetricCard label="Clarity" value={`${Math.round(metrics.clarity * 100)}%`} accent="from-accent/30 to-accent/10" />
        <MetricCard label="Organisation" value={`${Math.round(metrics.organisation * 100)}%`} accent="from-primary/25 to-background" />
        <MetricCard label="Pace variability" value={`${Math.round(metrics.paceVariability * 100)}%`} accent="from-primary/15 to-background" />
        <MetricCard
          label="Sentiment"
          value={metrics.sentiment}
          accent="from-emerald-200/60 to-background"
          additional={<Badge variant="outline" className="capitalize">{metrics.energy} energy</Badge>}
        />
        <MetricCard label="Total filler words" value={String(fillerWordTotal)} accent="from-red-200/60 to-background" />
      </div>
      <Card className="border-none bg-card/90 shadow-elevated backdrop-blur">
        <CardHeader>
          <CardTitle>Filler word breakdown</CardTitle>
          <CardDescription>Track which phrases to trim in your next rehearsal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phrase</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(metrics.fillerWordCounts).map(([word, count]) => (
                <TableRow key={word}>
                  <TableCell className="capitalize">{word}</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
  readonly additional?: ReactNode;
}

function MetricCard({ label, value, accent, additional }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-elevated",
        `bg-gradient-to-br ${accent}`,
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
      {additional && <div className="mt-3">{additional}</div>}
    </div>
  );
}

function ProcessingSkeleton() {
  return (
    <div className="grid gap-6 animate-fade-up" style={{ "--fade-delay": "0.1s" } as CSSProperties}>
      <Card className="border-none bg-card/85 shadow-elevated backdrop-blur">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`metric-skeleton-${index}`} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Card className="border-none bg-card/85 shadow-elevated">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`filler-skeleton-${index}`} className="h-6 w-full rounded-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
