'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getExercise } from '@/lib/exercises';
import { analyzeAudioInWorker, type AudioMetrics } from '@/lib/audio-analysis';
import { coachAttempt, type CoachResult } from '@/lib/coach';
import { loadCalibration, toCalibrationInput } from '@/lib/calibration';
import { recordAttempt } from '@/lib/local-store';
import { createTranscriber, isSpeechRecognitionSupported, type LiveTranscriber } from '@/lib/speech-recognition';
import { Ring } from '@/components/train/ring';
import { DeliveryTimeline } from '@/components/train/delivery-timeline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/lib/exercises';

type Phase = 'intro' | 'recording' | 'analyzing' | 'results';
type TranscriptionState = 'idle' | 'listening' | 'unavailable' | 'unsupported';

export default function ExercisePlayer({ params }: { params: { id: string } }) {
  const router = useRouter();
  const exercise = getExercise(params.id);

  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0); // live mic level 0-1
  const [transcript, setTranscript] = useState('');
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [reward, setReward] = useState<{ streakIncreased: boolean; goalReached: boolean; streak: number } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>('idle');
  const [transcriptionDiag, setTranscriptionDiag] = useState<string | null>(null);

  // Recording infra refs.
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const transcriptRef = useRef('');
  const sttDiagRef = useRef<{ audioStarted: boolean; gotResult: boolean; error: string | null }>({
    audioStarted: false,
    gotResult: false,
    error: null,
  });

  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    transcriberRef.current?.stop();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    rafRef.current = null;
    timerRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const finishAnalysis = useCallback(
    async (blob: Blob) => {
      if (!exercise) return;
      setPhase('analyzing');
      const text = transcriptRef.current.trim();
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : undefined;
      if (!wordCount) {
        const d = sttDiagRef.current;
        setTranscriptionDiag(
          !speechSupported
            ? 'this browser has no speech recognition'
            : d.error
            ? `speech recognition error: ${d.error}`
            : !d.audioStarted
            ? 'the recorder is holding the mic, so speech recognition received no audio'
            : !d.gotResult
            ? 'speech recognition ran but returned no words'
            : 'no words were captured'
        );
      } else {
        setTranscriptionDiag(null);
      }
      const calibration = toCalibrationInput(loadCalibration());
      const audio = await analyzeAudioInWorker(blob, wordCount, calibration);
      setMetrics(audio);
      const coached = coachAttempt(exercise, text, audio);
      setResult(coached);
      const saved = recordAttempt({
        exerciseId: exercise.id,
        score: coached.overallScore,
        xp: coached.xpEarned,
        wordCount: coached.wordCount,
      });
      setReward({
        streakIncreased: saved.streakIncreased,
        goalReached: saved.goalReached,
        streak: saved.progress.streak,
      });
      setPhase('results');
    },
    [exercise, speechSupported]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setSeconds(0);
    chunksRef.current = [];
    setTranscriptionState(speechSupported ? 'listening' : 'unsupported');

    // Start live transcription *synchronously* inside the tap handler. Android
    // Chrome blocks SpeechRecognition.start() once the user gesture is consumed
    // by `await getUserMedia`, which is why transcription previously never ran.
    sttDiagRef.current = { audioStarted: false, gotResult: false, error: null };
    const transcriber = createTranscriber({
      onTranscript: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
        if (text) {
          sttDiagRef.current.gotResult = true;
          setTranscriptionState('listening');
        }
      },
      onError: (e) => {
        if (['not-allowed', 'service-not-allowed', 'network', 'language-not-supported', 'audio-capture'].includes(e)) {
          setTranscriptionState('unavailable');
        }
      },
      onStatus: (s) => {
        if (s === 'audiostart') sttDiagRef.current.audioStarted = true;
        else if (s === 'result') sttDiagRef.current.gotResult = true;
        else if (s.startsWith('error:')) sttDiagRef.current.error = s.slice(6);
      },
    });
    transcriberRef.current = transcriber;
    transcriber?.start();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Recorder
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        void finishAnalysis(blob);
      };
      recorder.start();

      // Live level meter
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new Ctx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase('recording');
    } catch (err) {
      console.error(err);
      transcriber?.stop();
      transcriberRef.current = null;
      setError('Microphone access is required. Please allow it and try again.');
    }
  }, [finishAnalysis, speechSupported]);

  const stopRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setLevel(0);
    transcriberRef.current?.stop();
    recorderRef.current?.stop(); // triggers onstop → finishAnalysis
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const rescore = useCallback(() => {
    if (!exercise || !metrics) return;
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const adjusted: AudioMetrics = {
      ...metrics,
      wpm: metrics.durationSec ? Math.round((words.length / metrics.durationSec) * 60) : undefined,
      articulationWpm:
        metrics.speakingSec > 1 ? Math.round((words.length / metrics.speakingSec) * 60) : undefined,
    };
    setResult(coachAttempt(exercise, transcript.trim(), adjusted));
  }, [exercise, metrics, transcript]);

  const retry = useCallback(() => {
    cleanup();
    setResult(null);
    setMetrics(null);
    setReward(null);
    setAudioUrl(null);
    setTranscript('');
    transcriptRef.current = '';
    setTranscriptionState('idle');
    setTranscriptionDiag(null);
    setPhase('intro');
  }, [cleanup]);

  if (!exercise) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-white/70">Exercise not found.</p>
        <Button asChild variant="secondary">
          <Link href="/train">Back to path</Link>
        </Button>
      </div>
    );
  }

  const targetPct = Math.min(100, (seconds / exercise.targetSeconds) * 100);
  const reachedTarget = seconds >= exercise.targetSeconds;

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/train" className="text-sm text-white/50 hover:text-white" onClick={cleanup}>
          ✕ Close
        </Link>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
          {exercise.emoji} {exercise.title}
        </span>
      </div>

      {phase === 'intro' && (
        <IntroView exercise={exercise} onStart={startRecording} error={error} speechSupported={speechSupported} />
      )}

      {phase === 'recording' && (
        <RecordingView
          exercise={exercise}
          seconds={seconds}
          level={level}
          transcript={transcript}
          transcriptionState={transcriptionState}
          targetPct={targetPct}
          reachedTarget={reachedTarget}
          targetSeconds={exercise.targetSeconds}
          onStop={stopRecording}
        />
      )}

      {phase === 'analyzing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-violet-500" />
          <p className="text-white/60">Analysing your delivery…</p>
        </div>
      )}

      {phase === 'results' && result && metrics && (
        <ResultsView
          result={result}
          metrics={metrics}
          reward={reward}
          audioUrl={audioUrl}
          transcriptionDiag={transcriptionDiag}
          transcript={transcript}
          setTranscript={setTranscript}
          onRescore={rescore}
          onRetry={retry}
          onDone={() => router.push('/train')}
          editable={transcript.trim().length > 0 || speechSupported}
        />
      )}
    </div>
  );
}

// ─────────────────────────────── Intro ───────────────────────────────

function IntroView({
  exercise,
  onStart,
  error,
  speechSupported,
}: {
  exercise: ReturnType<typeof getExercise> & {};
  onStart: () => void;
  error: string | null;
  speechSupported: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <span className="inline-block rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
            {exercise.scenario}
          </span>
          <p className="mt-2 text-sm text-white/50">
            {exercise.type === 'read' ? 'Read aloud' : exercise.type === 'story' ? 'Walk it through' : 'Speak to the prompt'} · ~
            {exercise.targetSeconds}s
          </p>
          <h1 className="mt-1 text-3xl font-bold">{exercise.title}</h1>
          <p className="mt-1 text-white/60">{exercise.summary}</p>
        </div>

        {exercise.prompt && (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Your prompt</p>
            <p className="mt-1.5 text-lg leading-snug">{exercise.prompt}</p>
          </div>
        )}

        {exercise.readingText && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Read this aloud</p>
            <p className="mt-1.5 text-lg leading-relaxed">{exercise.readingText}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-white/70">How to do it</p>
          <ol className="space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">💡 Coach tips</p>
          <ul className="mt-1.5 space-y-1">
            {exercise.tips.map((tip) => (
              <li key={tip} className="text-sm text-white/60">
                • {tip}
              </li>
            ))}
          </ul>
        </div>

        {!speechSupported && (
          <p className="rounded-xl bg-white/5 p-3 text-xs text-white/45">
            Heads up: live transcription isn&apos;t available in this browser (try Chrome). Your delivery — pace,
            pauses, intonation, energy — is still measured from the audio, and you can type what you said afterwards
            for structure &amp; content feedback.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <Button onClick={onStart} size="lg" className="mt-4 h-14 w-full rounded-2xl bg-violet-600 text-base hover:bg-violet-500">
        🎙️ Start recording
      </Button>
    </div>
  );
}

// ───────────────────────────── Recording ─────────────────────────────

function RecordingView({
  exercise,
  seconds,
  level,
  transcript,
  transcriptionState,
  targetPct,
  reachedTarget,
  targetSeconds,
  onStop,
}: {
  exercise: Exercise;
  seconds: number;
  level: number;
  transcript: string;
  transcriptionState: TranscriptionState;
  targetPct: number;
  reachedTarget: boolean;
  targetSeconds: number;
  onStop: () => void;
}) {
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const transcriptUnavailable = transcriptionState === 'unavailable' || transcriptionState === 'unsupported';
  return (
    <div className="flex flex-1 flex-col">
      {/* Compact timer + live level meter */}
      <div className="flex shrink-0 flex-col items-center">
        <Ring value={targetPct} size={132} stroke={10} color={reachedTarget ? '#22c55e' : '#7c3aed'}>
          <span className="text-3xl font-bold tabular-nums">{mmss}</span>
          <span className="mt-0.5 text-[10px] text-white/45">
            {reachedTarget ? 'wrap up anytime' : `target ~${targetSeconds}s`}
          </span>
        </Ring>
        <div className="mt-3 flex h-8 items-end gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const threshold = (i + 1) / 9;
            const active = level >= threshold * 0.9 || Math.random() < level * 0.4;
            return (
              <span
                key={i}
                className={cn('w-2 rounded-full transition-all', active ? 'bg-violet-400' : 'bg-white/10')}
                style={{ height: `${10 + (active ? level * 28 : 4)}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Keep the task in view while recording (essential for read-aloud drills). */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {exercise.readingText && (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Read this aloud</p>
            <p className="mt-1.5 text-lg leading-relaxed">{exercise.readingText}</p>
          </div>
        )}
        {!exercise.readingText && exercise.prompt && (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Your prompt</p>
            <p className="mt-1.5 text-base leading-snug">{exercise.prompt}</p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35">
            {transcriptUnavailable ? 'Transcript' : 'Live transcript'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">
            {transcript ? (
              transcript
            ) : transcriptUnavailable ? (
              <span className="text-white/35">
                Live transcription isn&apos;t available in this browser — your delivery is still measured, and you
                can type what you said afterwards for structure &amp; content feedback.
              </span>
            ) : (
              <span className="text-white/30">Listening… start speaking.</span>
            )}
          </p>
        </div>
      </div>

      <Button
        onClick={onStop}
        size="lg"
        className="mt-4 h-14 w-full shrink-0 rounded-2xl bg-red-500 text-base hover:bg-red-400"
      >
        ⏹ Stop &amp; get feedback
      </Button>
    </div>
  );
}

// ────────────────────────────── Results ──────────────────────────────

function ResultsView({
  result,
  metrics,
  reward,
  audioUrl,
  transcriptionDiag,
  transcript,
  setTranscript,
  onRescore,
  onRetry,
  onDone,
  editable,
}: {
  result: CoachResult;
  metrics: AudioMetrics;
  reward: { streakIncreased: boolean; goalReached: boolean; streak: number } | null;
  audioUrl: string | null;
  transcriptionDiag: string | null;
  transcript: string;
  setTranscript: (v: string) => void;
  onRescore: () => void;
  onRetry: () => void;
  onDone: () => void;
  editable: boolean;
}) {
  const scoreColor = result.overallScore >= 80 ? '#22c55e' : result.overallScore >= 60 ? '#7c3aed' : '#f59e0b';
  const headline =
    result.overallScore >= 85 ? 'Outstanding! 🌟' : result.overallScore >= 70 ? 'Great take! 👏' : result.overallScore >= 50 ? 'Solid effort 💪' : 'Good start — keep going';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-2">
        {/* Score + XP */}
        <div className="flex flex-col items-center pt-2">
          <Ring value={result.overallScore} size={150} stroke={12} color={scoreColor}>
            <span className="text-4xl font-bold">{result.overallScore}</span>
            <span className="text-xs text-white/45">score</span>
          </Ring>
          <p className="mt-3 text-xl font-bold">{headline}</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-300">
              +{result.xpEarned} XP
            </span>
            {reward?.streakIncreased && (
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-sm font-semibold text-orange-300">
                🔥 {reward.streak} day streak
              </span>
            )}
            {reward?.goalReached && (
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-semibold text-green-300">
                🎯 Goal hit!
              </span>
            )}
          </div>
        </div>

        {/* Self-review playback + delivery timeline */}
        {audioUrl && (
          <DeliveryTimeline audioUrl={audioUrl} durationSec={metrics.durationSec} events={metrics.events} />
        )}

        {/* No-transcript fallback: make the type-to-score path obvious */}
        {result.wordCount === 0 && !metrics.unavailable && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-100">
              ✍️ We couldn&apos;t transcribe your words on this device. Type what you said in the box below and tap
              Re-score to grade your Opening, Clarity &amp; Structure.
            </p>
            {transcriptionDiag && (
              <p className="mt-1.5 text-xs text-amber-200/70">Why: {transcriptionDiag}.</p>
            )}
          </div>
        )}

        {/* Dimension breakdown */}
        <div className="space-y-2.5">
          {result.scores.map((s) => (
            <div key={s.dimension} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{s.label}</span>
                <span className={cn('text-sm font-bold', !s.measured && 'text-white/30')}>
                  {s.measured ? s.score : '—'}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${s.measured ? s.score : 0}%`,
                    backgroundColor: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#7c3aed' : '#f59e0b',
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/55">{s.detail}</p>
            </div>
          ))}
        </div>

        {/* Quick win */}
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">🎯 Try this next</p>
          <p className="mt-1 text-sm text-white/80">{result.quickWin}</p>
        </div>

        {/* Strengths / improvements */}
        {result.strengths.length > 0 && (
          <Bullets title="What worked" color="text-green-300" items={result.strengths} />
        )}
        {result.improvements.length > 0 && (
          <Bullets title="Focus areas" color="text-amber-300" items={result.improvements} />
        )}

        {/* Quick audio stats — all measured on-device from your recording */}
        {!metrics.unavailable && (
          <div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="Speaking" value={`${Math.round(metrics.speakingSec)}s`} />
              <Stat label="Pace" value={`${metrics.articulationWpm ?? metrics.estimatedWpm ?? '—'}`} sub="wpm" />
              <Stat label="Pauses" value={`${metrics.pauseCount}`} />
              <Stat label="Fillers" value={`${result.fillerCount}`} />
            </div>
            <p className="mt-2 text-center text-[11px] text-white/35">
              🔒 Analysed from your audio on-device — tone, pace, pauses, volume &amp; fillers.
            </p>
          </div>
        )}

        {/* Transcript (editable for re-scoring) */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
            Your words {editable && '(edit to re-score structure & content)'}
          </p>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            placeholder="No words captured — type what you said for structure & content feedback."
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 placeholder:text-white/25"
          />
          <Button onClick={onRescore} variant="secondary" size="sm" className="mt-2 bg-white/10 hover:bg-white/20">
            Re-score
          </Button>
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <Button onClick={onRetry} variant="secondary" className="h-12 flex-1 rounded-2xl bg-white/10 hover:bg-white/20">
          Try again
        </Button>
        <Button onClick={onDone} className="h-12 flex-1 rounded-2xl bg-violet-600 hover:bg-violet-500">
          Done
        </Button>
      </div>
    </div>
  );
}

function Bullets({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className={cn('text-xs font-semibold uppercase tracking-wide', color)}>{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-white/70">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 py-3">
      <p className="text-lg font-bold">
        {value}
        {sub && <span className="text-xs font-normal text-white/40"> {sub}</span>}
      </p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  );
}
