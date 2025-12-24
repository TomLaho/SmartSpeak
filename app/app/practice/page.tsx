'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowPathIcon, CloudArrowUpIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const modes = [
  { label: 'Free Practice', value: 'FREE', helper: 'Speak freely and iterate quickly.' },
  { label: 'Read', value: 'READ', helper: 'Read from provided text to improve clarity.' },
  { label: 'Topic', value: 'TOPIC', helper: 'Respond to a random topic prompt.' },
];

const prompts = [
  'Explain your product in under two minutes.',
  'Summarize a recent article you read.',
  'Convince someone to adopt a new habit.',
  'Share a story about a time you solved a problem.',
];

const readings = [
  '“The best way to predict the future is to invent it.” — Alan Kay',
  '“Simplicity is prerequisite for reliability.” — Edsger Dijkstra',
  '“Clear communication is the cornerstone of leadership.”',
];

type Step = 'idle' | 'uploading' | 'transcribing' | 'editing' | 'analyzing' | 'done';

type SessionResponse = {
  session: { id: string };
};

export default function PracticePage() {
  const router = useRouter();
  const [title, setTitle] = useState('Practice session');
  const [mode, setMode] = useState<'FREE' | 'READ' | 'TOPIC'>('FREE');
  const [promptText, setPromptText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const randomPrompt = useMemo(() => prompts[Math.floor(Math.random() * prompts.length)], []);
  const randomReading = useMemo(() => readings[Math.floor(Math.random() * readings.length)], []);

  useEffect(() => {
    if (mode === 'READ') setPromptText(randomReading);
    if (mode === 'TOPIC') setPromptText(randomPrompt);
    if (mode === 'FREE') setPromptText('');
  }, [mode, randomPrompt, randomReading]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
      };
      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error(err);
      setError('Microphone permission denied.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFileChange = (file?: File | null) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large (max 20MB).');
      return;
    }
    setAudioFile(file);
  };

  const uploadAndTranscribe = async () => {
    if (!audioFile) {
      setError('Please record or upload audio first.');
      return;
    }
    setError(null);
    setStep('uploading');
    try {
      const uploadUrlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: audioFile.type || 'audio/webm' }),
      });
      const uploadUrlJson = await uploadUrlRes.json();
      if (!uploadUrlRes.ok) throw new Error(uploadUrlJson.error || 'Failed to get upload URL');

      await fetch(uploadUrlJson.url, {
        method: 'PUT',
        headers: { 'Content-Type': audioFile.type },
        body: audioFile,
      });

      const sessionRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          mode,
          promptText: promptText || undefined,
          audioKey: uploadUrlJson.key,
          audioMimeType: audioFile.type,
          durationSeconds: duration || undefined,
        }),
      });
      const sessionJson: SessionResponse = await sessionRes.json();
      if (!sessionRes.ok) throw new Error((sessionJson as any).error || 'Failed to create session');
      setSessionId(sessionJson.session.id);

      setStep('transcribing');
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionJson.session.id }),
      });
      const transcribeJson = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeJson.error || 'Transcription failed');
      setTranscript(transcribeJson.transcript);
      setStep('editing');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unexpected error');
      setStep('idle');
    }
  };

  const analyze = async () => {
    if (!sessionId) return;
    setStep('analyzing');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, editedTranscript: transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');
      setStep('done');
      router.push(`/app/session/${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Analysis error');
      setStep('editing');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Practice</CardTitle>
          <CardDescription>Record or upload a 2-5 minute speech. Max 20MB or 10 minutes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team update" />
            </div>
            <div>
              <label className="text-sm font-medium">Mode</label>
              <Select value={mode} onChange={(e) => setMode(e.target.value as any)} options={modes.map((m) => ({ label: m.label, value: m.value }))} />
              <p className="text-xs text-muted-foreground">{modes.find((m) => m.value === mode)?.helper}</p>
            </div>
          </div>

          {(mode === 'READ' || mode === 'TOPIC') && (
            <div>
              <label className="text-sm font-medium">Prompt</label>
              <Textarea rows={3} value={promptText} onChange={(e) => setPromptText(e.target.value)} />
              <p className="text-xs text-muted-foreground">Feel free to edit the suggested text.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Recorder / Upload</p>
                <p className="text-xs text-muted-foreground">Record here or select an audio file.</p>
              </div>
              <Badge variant="secondary">{recording ? 'Recording...' : audioFile ? 'Ready' : 'Idle'}</Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {!recording ? (
                <Button onClick={startRecording} variant="outline" className="gap-2">
                  <MicrophoneIcon className="h-4 w-4" /> Start recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="gap-2">
                  <StopIcon className="h-4 w-4" /> Stop
                </Button>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                <CloudArrowUpIcon className="h-4 w-4" />
                <span>Upload audio</span>
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0])} />
              </label>
              {audioFile && <p className="text-xs text-muted-foreground">Selected: {audioFile.name}</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">Duration:</span> {duration}s
            </div>
            <div className="flex gap-2">
              <Button onClick={uploadAndTranscribe} disabled={step === 'uploading' || step === 'transcribing'} className="gap-2">
                {step === 'uploading' || step === 'transcribing' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                {step === 'uploading' ? 'Uploading...' : step === 'transcribing' ? 'Transcribing...' : 'Upload & Transcribe'}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          {step !== 'idle' && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold">Progress</p>
              <ol className="mt-2 space-y-2 text-sm">
                <li className={step !== 'idle' ? 'text-foreground' : 'text-muted-foreground'}>1) Uploading</li>
                <li className={['transcribing', 'editing', 'analyzing', 'done'].includes(step) ? 'text-foreground' : 'text-muted-foreground'}>
                  2) Transcribing
                </li>
                <li className={['editing', 'analyzing', 'done'].includes(step) ? 'text-foreground' : 'text-muted-foreground'}>3) Metrics</li>
                <li className={['analyzing', 'done'].includes(step) ? 'text-foreground' : 'text-muted-foreground'}>4) AI Feedback</li>
              </ol>
            </div>
          )}

          {['editing', 'analyzing', 'done'].includes(step) && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Transcript (edit before analysis)</p>
              <Textarea rows={10} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={analyze} disabled={step === 'analyzing'} className="gap-2">
                  {step === 'analyzing' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                  {step === 'analyzing' ? 'Analyzing...' : 'Generate AI Feedback'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/app/history')}>Skip for now</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips for a great run</CardTitle>
          <CardDescription>Keep it concise and structured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Aim for 2–5 minutes. This keeps Whisper fast and feedback crisp.</p>
          <p>• Speak clearly and vary your pacing. Avoid long stretches without pauses.</p>
          <p>• Use signposts like “first”, “next”, “finally” to improve structure score.</p>
          <p>• After transcription, skim for accuracy and fix any names before analysis.</p>
        </CardContent>
      </Card>
    </div>
  );
}
