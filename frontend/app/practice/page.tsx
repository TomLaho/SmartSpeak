"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, LogIn, Mic, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createUploadTarget, transcribeStoredAudio, uploadToTarget } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";

type PracticeStep = "idle" | "preparing-upload" | "uploading" | "transcribing" | "complete" | "error";

type StatusState = {
  step: PracticeStep;
  message: string;
};

const defaultStatus: StatusState = { step: "idle", message: "Record or upload a clip to start practicing." };

export default function PracticePage() {
  return <PracticeWorkbench />;
}

function PracticeWorkbench() {
  const { isLoaded, isSignedIn, userId, getToken, signIn } = useAuth();
  const [status, setStatus] = useState<StatusState>(defaultStatus);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setStatus(defaultStatus);
    setTranscript("");
    setSessionId(null);
    setStorageKey(null);
    setStorageMode(null);
    setSelectedFileName(null);
  }, []);

  const uploadAndTranscribe = useCallback(
    async (file: File) => {
      reset();
      setError(null);
      setStatus({ step: "preparing-upload", message: "Preparing a secure upload URL…" });
      try {
        const token = (await getToken()) ?? undefined;
        const target = await createUploadTarget(file.type || "application/octet-stream", token);
        setStatus({ step: "uploading", message: "Uploading audio to storage…" });
        await uploadToTarget(target.uploadUrl, file);
        setStatus({ step: "transcribing", message: "Downloading audio and calling Whisper…" });
        const response = await transcribeStoredAudio(target.storageKey, userId, token);
        setTranscript(response.transcript);
        setSessionId(response.id);
        setStorageKey(response.storageKey);
        setStorageMode(response.storageMode);
        setStatus({ step: "complete", message: "Transcript ready" });
      } catch (err) {
        console.error("Practice upload failed", err);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't process this clip. Please try again or pick a smaller file.",
        );
        setStatus({ step: "error", message: "Processing failed" });
      }
    },
    [getToken, reset, userId],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFileName(file.name);
        void uploadAndTranscribe(file);
      }
    },
    [uploadAndTranscribe],
  );

  const startRecording = useCallback(async () => {
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
          void uploadAndTranscribe(file);
        } else {
          setError("We couldn't capture audio. Please try again.");
        }
      };
      recorder.start();
      setIsRecording(true);
      setStatus({ step: "uploading", message: "Recording… tap stop to upload" });
    } catch (err) {
      console.error("Microphone permission denied", err);
      setError("Microphone access was denied. Check your browser permissions and try again.");
    }
  }, [uploadAndTranscribe]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const statusBadge = useMemo(() => {
    if (status.step === "complete") return <Badge variant="secondary">Complete</Badge>;
    if (status.step === "error") return <Badge variant="destructive">Error</Badge>;
    if (status.step === "transcribing" || status.step === "uploading" || status.step === "preparing-upload") {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Working
        </Badge>
      );
    }
    return <Badge variant="outline">Idle</Badge>;
  }, [status.step]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Auth via Clerk, storage via presigned URLs
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Practice a speech</h1>
            <p className="max-w-3xl text-muted-foreground">
              Record or upload a clip. We&apos;ll stream it to object storage with a presigned URL, download it from the backend, and run Whisper to store your transcript.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
              </Link>
            </Button>
            {!isSignedIn && (
              <Button variant="secondary" onClick={signIn} className="gap-2">
                <LogIn className="h-4 w-4" aria-hidden /> Sign in with Clerk
              </Button>
            )}
          </div>
        </div>
        {statusBadge}
      </div>

      <Card className="border-none bg-card/80 shadow-elevated backdrop-blur">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Capture audio</CardTitle>
            <CardDescription>Upload a file or record directly in the browser.</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {isLoaded ? (isSignedIn ? `Signed in${userId ? ` as ${userId}` : ""}` : "Guest mode (not saved to profile)") : "Checking auth…"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Upload audio</p>
                <Badge variant="outline">Max 50MB</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                We issue a presigned URL and stream the file directly to storage before transcription.
              </p>
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
                className={cn(
                  "group flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/60 text-center transition hover:border-primary hover:shadow-elevated",
                  selectedFileName && "border-primary/60",
                )}
              >
                <UploadCloud className="h-6 w-6 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Drag & drop or browse</p>
                  <p className="text-xs text-muted-foreground">MP3, WAV, MP4, or WebM.</p>
                </div>
                {selectedFileName && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {selectedFileName}
                  </Badge>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Record in-browser</p>
                <Badge variant="outline">WebM</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Start a quick recording to test the vertical slice without leaving the page.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className={cn("gap-2 rounded-full px-6", isRecording ? "bg-destructive text-destructive-foreground" : "")}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  <Mic className="h-4 w-4" aria-hidden />
                  {isRecording ? "Stop recording" : "Start recording"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  We upload the clip with a presigned URL as soon as you stop.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {status.step === "transcribing" || status.step === "uploading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            ) : status.step === "complete" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <UploadCloud className="h-4 w-4 text-primary" aria-hidden />
            )}
            <span>{status.message}</span>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/85 shadow-elevated backdrop-blur">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>We persist transcripts after Whisper runs on the backend.</CardDescription>
          </div>
          {sessionId && (
            <Badge variant="outline" className="text-xs">
              Session {sessionId}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={8}
            className="resize-none rounded-2xl border border-border/70 bg-muted/20"
            placeholder="Your transcript will appear here after uploading."
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{storageMode ? `Storage: ${storageMode}` : "Waiting for upload"}</Badge>
            {storageKey && <Badge variant="outline">Key: {storageKey}</Badge>}
            <Badge variant="outline">{status.step === "complete" ? "Saved to DB" : "Not saved yet"}</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
