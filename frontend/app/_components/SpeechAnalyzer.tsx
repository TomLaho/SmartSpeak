"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { analyzeTranscriptRequest, uploadSpeechFile } from "@/lib/api";
import { useLocalUser } from "@/lib/hooks/useLocalUser";
import type { AnalysisResponse } from "@/types/api";
import BackendStatus from "./BackendStatus";

interface StatusState {
  step: "idle" | "uploading" | "transcribing" | "analyzing" | "complete" | "error";
  message: string;
  progress: number;
}

const initialStatus: StatusState = {
  step: "idle",
  message: "Upload a file or record a new speech to begin.",
  progress: 0,
};

export function SpeechAnalyzer() {
  const { userId } = useLocalUser();
  const [status, setStatus] = useState<StatusState>(initialStatus);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const reset = useCallback(() => {
    setStatus(initialStatus);
    setAnalysis(null);
    setTranscript("");
    setError(null);
  }, []);

  const runAnalysis = useCallback(
    async (text: string) => {
      setStatus({ step: "analyzing", message: "Analysing transcript with SmartSpeak coach…", progress: 75 });
      try {
        const result = await analyzeTranscriptRequest(text, userId || undefined);
        setAnalysis(result);
        setTranscript(text);
        setStatus({ step: "complete", message: "Analysis complete", progress: 100 });
      } catch (err) {
        console.error(err);
        setError("We couldn't analyse this transcript. Please try again.");
        setStatus({ step: "error", message: "Analysis failed", progress: 100 });
      }
    },
    [userId],
  );

  const handleFileUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      reset();
      setStatus({ step: "uploading", message: "Uploading media…", progress: 10 });
      try {
        const upload = await uploadSpeechFile(file);
        setStatus({ step: "transcribing", message: "Transcribing speech with Azure…", progress: 50 });
        await runAnalysis(upload.transcript);
      } catch (err) {
        console.error(err);
        setError("Upload failed. Please try again with a different file.");
        setStatus({ step: "error", message: "Upload failed", progress: 100 });
      }
    },
    [reset, runAnalysis],
  );

  const handleManualSubmit = useCallback(
    async () => {
      if (!manualTranscript.trim()) {
        setError("Enter a transcript before analysing.");
        return;
      }
      setError(null);
      reset();
      await runAnalysis(manualTranscript.trim());
    },
    [manualTranscript, reset, runAnalysis],
  );

  const handleStartRecording = async () => {
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
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], "recording.webm", { type: blob.type });
          void handleFileUpload(file);
        }
      };
      recorder.start();
      setIsRecording(true);
      setStatus({ step: "uploading", message: "Recording in progress…", progress: 5 });
    } catch (err) {
      console.error(err);
      setError("Microphone access was denied. Please allow access and try again.");
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const renderMetrics = () => {
    if (!analysis) return null;

    const { metrics } = analysis;
    const fillerEntries = Object.entries(metrics.fillerWordCounts);

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery metrics</CardTitle>
            <CardDescription>Understand your speaking pace and energy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Metric label="Words per minute" value={metrics.wordsPerMinute.toString()} />
              <Metric
                label="Pace variability"
                value={`${Math.round(metrics.paceVariability * 100)}%`}
              />
              <Metric label="Sentiment" value={metrics.sentiment} />
              <Metric label="Energy" value={metrics.energy} />
              <Metric
                label="Clarity"
                value={`${Math.round(metrics.clarity * 100)}%`}
              />
              <Metric
                label="Organisation"
                value={`${Math.round(metrics.organisation * 100)}%`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Filler word usage</CardTitle>
            <CardDescription>Spot opportunities to pause instead of filling gaps.</CardDescription>
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
                {fillerEntries.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="capitalize">{key}</TableCell>
                    <TableCell className="text-right font-medium">{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!analysis) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggestions for improvement</CardTitle>
          <CardDescription>Actionable tips tailored to your delivery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.suggestions.map((suggestion, index) => (
            <div key={index} className="rounded-lg border border-border bg-background/40 p-4">
              <p className="text-sm font-semibold">{suggestion.title}</p>
              <p className="text-sm text-muted-foreground">{suggestion.detail}</p>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={reset}>
            Analyse another speech
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <div className="grid gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Coach your public speaking with AI feedback.</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Record or upload a speech, receive a full transcript, and get guidance on pacing, energy, clarity, and filler words in
          minutes.
        </p>
      </div>

      <BackendStatus />

      <Card>
        <CardHeader>
          <CardTitle>Start a new analysis</CardTitle>
          <CardDescription>
            Choose how you want to capture your speech. We will process the audio, generate a transcript, and surface insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList>
              <TabsTrigger value="upload">Upload file</TabsTrigger>
              <TabsTrigger value="record">Record live</TabsTrigger>
              <TabsTrigger value="manual">Paste transcript</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <div className="flex flex-col gap-3">
                <Input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(event) => void handleFileUpload(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats include MP3, WAV, MP4, MOV, and WebM. Files are limited to 50MB.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="record">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Button onClick={isRecording ? handleStopRecording : handleStartRecording} variant={isRecording ? "destructive" : "default"}>
                    {isRecording ? "Stop recording" : "Start recording"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? "Recording… speak clearly into your microphone." : "We'll use your microphone to capture audio."}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="manual">
              <div className="space-y-3">
                <Textarea
                  placeholder="Paste your transcript here to get insights without uploading audio."
                  rows={6}
                  value={manualTranscript}
                  onChange={(event) => setManualTranscript(event.target.value)}
                />
                <div className="flex items-center gap-3">
                  <Button onClick={() => void handleManualSubmit()}>Analyse transcript</Button>
                  {!userId && <p className="text-xs text-muted-foreground">Add a user id in the header to save this analysis to your history.</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Progress value={status.progress} />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{status.message}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>The text we analysed for this session.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={transcript} readOnly rows={6} className="bg-muted/40" />
            </CardContent>
          </Card>

          {renderMetrics()}
          {renderSuggestions()}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

