'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getExercise, pickVariation, BENCHMARKS } from '@/lib/exercises';
import { analyzeAudioInWorker, type AudioMetrics } from '@/lib/audio-analysis';
import { coachAttempt, type CoachResult } from '@/lib/coach';
import { loadCalibration, toCalibrationInput } from '@/lib/calibration';
import { transcribeOnDevice, isOnDeviceTranscriptionSupported, type TranscribeProgress } from '@/lib/transcribe';
import { isProCached, refreshEntitlement, canAccessExercise } from '@/lib/entitlement';
import {
  loadProgress,
  recordAttempt,
  dimensionTrend,
  lastDimensionScores,
  loadLastChallenge,
  saveLastChallenge,
  type Progress,
} from '@/lib/local-store';
import { evaluateAchievements, ACHIEVEMENTS, type Achievement } from '@/lib/achievements';
import { createTranscriber, isSpeechRecognitionSupported, type LiveTranscriber } from '@/lib/speech-recognition';
import { haptic } from '@/lib/haptics';
import { Ring } from '@/components/train/ring';
import { Sparkline } from '@/components/train/sparkline';
import { TierBadge } from '@/components/train/tier-badge';
import { Celebration } from '@/components/train/celebration';
import { AchievementToast } from '@/components/train/achievement-toast';
import { DeliveryTimeline } from '@/components/train/delivery-timeline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Exercise, Dimension } from '@/lib/exercises';

type Phase = 'intro' | 'recording' | 'analyzing' | 'results';

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
  const [transcriptionDiag, setTranscriptionDiag] = useState<string | null>(null);
  const [transcribeStatus, setTranscribeStatus] = useState<TranscribeProgress | null>(null);

  // Challenge (deliberate-practice "one thing" focus for this rep).
  const [challenge, setChallenge] = useState<Dimension | null>(null);
  // Attempt count for variation picking — read from localStorage on mount only,
  // so the server and first client render agree (avoids hydration mismatch).
  const [attemptCount, setAttemptCount] = useState(0);

  // Celebration + achievement queue state.
  const [celebrationShow, setCelebrationShow] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Progress snapshot captured after recordAttempt for sparklines.
  const [postRecordProgress, setPostRecordProgress] = useState<Progress | null>(null);

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

  // Start false so the server and the first client render agree; resolve the
  // real (browser-only) capability after mount to avoid a hydration mismatch.
  const [speechSupported, setSpeechSupported] = useState(false);
  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  // Load persisted challenge + default to exercise's primary focus on mount.
  useEffect(() => {
    if (!exercise) return;
    const saved = loadLastChallenge() as Dimension | null;
    // Only restore if it's a valid focus dimension for this exercise.
    if (saved && exercise.focus.includes(saved as Dimension)) {
      setChallenge(saved as Dimension);
    } else {
      const defaultDim = exercise.focus[0] ?? null;
      setChallenge(defaultDim);
    }
    setAttemptCount(loadProgress().exercises[exercise.id]?.attempts ?? 0);
  }, [exercise]);

  // Advance achievement queue → currentAchievement one at a time.
  useEffect(() => {
    if (currentAchievement === null && achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      setCurrentAchievement(next);
      setAchievementQueue(rest);
    }
  }, [currentAchievement, achievementQueue]);

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

  // Gate deep links: free users get FREE_EXERCISE_LIMIT distinct exercises.
  useEffect(() => {
    if (!exercise) return;
    const progress = loadProgress();
    const alreadyAttempted = (progress.exercises[exercise.id]?.attempts ?? 0) > 0;
    const distinctAttempted = Object.values(progress.exercises).filter((e) => e.attempts > 0).length;
    if (canAccessExercise({ pro: isProCached(), alreadyAttempted, distinctAttempted })) return;
    // Cached state says locked — confirm with Play before redirecting to the paywall.
    refreshEntitlement().then((pro) => {
      if (!canAccessExercise({ pro, alreadyAttempted, distinctAttempted })) router.replace('/train/unlock');
    });
  }, [exercise, router]);

  const finishAnalysis = useCallback(
    async (blob: Blob) => {
      if (!exercise) return;
      setPhase('analyzing');
      let text = transcriptRef.current.trim();

      // No live transcript (the norm on Android) → transcribe the recorded clip
      // on-device. No mic contention, no upload, no backend.
      if (!text && isOnDeviceTranscriptionSupported()) {
        try {
          setTranscribeStatus({ stage: 'loading' });
          text = (await transcribeOnDevice(blob, (p) => setTranscribeStatus(p))).trim();
          if (text) {
            transcriptRef.current = text;
            setTranscript(text);
          }
        } catch (err: any) {
          sttDiagRef.current.error = sttDiagRef.current.error || `on-device transcription: ${err?.message ?? 'failed'}`;
        } finally {
          setTranscribeStatus(null);
        }
      }

      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : undefined;
      if (!wordCount) {
        const d = sttDiagRef.current;
        setTranscriptionDiag(
          d.error
            ? `transcription error: ${d.error}`
            : !isOnDeviceTranscriptionSupported()
            ? 'this browser cannot run on-device transcription'
            : 'we could not make out any speech in the recording'
        );
      } else {
        setTranscriptionDiag(null);
      }

      const calibration = toCalibrationInput(loadCalibration());
      const audio = await analyzeAudioInWorker(blob, wordCount, calibration);
      setMetrics(audio);

      // Read previous dimension scores before this attempt so coach can show deltas.
      const progressBeforeAttempt = loadProgress();
      const previous = lastDimensionScores(progressBeforeAttempt);
      const bestScoreBefore = progressBeforeAttempt.exercises[exercise.id]?.bestScore ?? 0;

      const coached = coachAttempt(exercise, text, audio, previous as Partial<Record<Dimension, number>>);
      setResult(coached);
      haptic('success');

      // Build per-dimension scores map for persistence.
      const dims: Partial<Record<string, number>> = {};
      for (const s of coached.scores) {
        if (s.measured) dims[s.dimension] = s.score;
      }

      const saved = recordAttempt({
        exerciseId: exercise.id,
        score: coached.overallScore,
        xp: coached.xpEarned,
        wordCount: coached.wordCount,
        dims,
      });

      setPostRecordProgress(saved.progress);

      setReward({
        streakIncreased: saved.streakIncreased,
        goalReached: saved.goalReached,
        streak: saved.progress.streak,
      });

      // Evaluate achievements.
      const today = new Date().toISOString().slice(0, 10);
      const graceUsedThisSession = saved.progress.graceUsedDay === today;
      const newIds = evaluateAchievements({
        result: coached,
        progress: saved.progress,
        exerciseId: exercise.id,
        graceUsedThisSession,
        totalReps: saved.progress.history.length,
      });

      if (newIds.length > 0) {
        const newAchievements = newIds.flatMap((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          return a ? [a] : [];
        });
        setAchievementQueue(newAchievements);
      }

      // Celebration: new personal best, goal reached, or streak milestone.
      const isNewPb = coached.overallScore > bestScoreBefore;
      if (isNewPb || saved.goalReached || (saved.streakIncreased && saved.progress.streak >= 2)) {
        setCelebrationShow(true);
      }

      setPhase('results');
    },
    [exercise]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setSeconds(0);
    chunksRef.current = [];
    // Best-effort live transcription, started *synchronously* inside the tap
    // handler (Android Chrome blocks SpeechRecognition.start() once the user
    // gesture is consumed by `await getUserMedia`). Where it works (e.g. desktop
    // Chrome) we get an instant transcript; otherwise we transcribe the recorded
    // clip on-device after the take. Lifecycle is captured for diagnostics.
    sttDiagRef.current = { audioStarted: false, gotResult: false, error: null };
    const transcriber = createTranscriber({
      onTranscript: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
        if (text) sttDiagRef.current.gotResult = true;
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
  }, [finishAnalysis]);

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
    setTranscriptionDiag(null);
    setTranscribeStatus(null);
    setCelebrationShow(false);
    setAchievementQueue([]);
    setCurrentAchievement(null);
    setPostRecordProgress(null);
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

  // The variation-picked prompt string (for topic/story exercises).
  const activePrompt = exercise.readingText
    ? undefined
    : pickVariation(exercise, attemptCount);
  const isVariation = activePrompt !== undefined && activePrompt !== exercise.prompt;

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/train" className="text-sm text-white/50 hover:text-white" onClick={cleanup}>
          ✕ Close
        </Link>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/60">
          {exercise.emoji} {exercise.title}
        </span>
      </div>

      {phase === 'intro' && (
        <IntroView
          exercise={exercise}
          onStart={startRecording}
          error={error}
          speechSupported={speechSupported}
          challenge={challenge}
          onChallengeChange={(dim) => {
            setChallenge(dim);
            saveLastChallenge(dim);
          }}
          activePrompt={activePrompt}
          isVariation={isVariation}
        />
      )}

      {phase === 'recording' && (
        <RecordingView
          exercise={exercise}
          seconds={seconds}
          level={level}
          targetPct={targetPct}
          reachedTarget={reachedTarget}
          targetSeconds={exercise.targetSeconds}
          onStop={stopRecording}
          activePrompt={activePrompt}
          isVariation={isVariation}
        />
      )}

      {phase === 'analyzing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-spotlight" />
          {transcribeStatus ? (
            <div>
              <p className="text-white/70">
                {transcribeStatus.stage === 'loading'
                  ? 'Setting up on-device transcription…'
                  : 'Transcribing your words…'}
              </p>
              {transcribeStatus.stage === 'loading' && (
                <p className="mt-1 text-xs text-white/40">
                  One-time download of a small, private speech model
                  {typeof transcribeStatus.percent === 'number' ? ` · ${transcribeStatus.percent}%` : ''} — cached after
                  this.
                </p>
              )}
            </div>
          ) : (
            <p className="text-white/60">Analysing your delivery…</p>
          )}
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
          postRecordProgress={postRecordProgress}
          exercise={exercise}
          celebrationShow={celebrationShow}
          onCelebrationDone={() => setCelebrationShow(false)}
          currentAchievement={currentAchievement}
          onAchievementDone={() => setCurrentAchievement(null)}
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
  challenge,
  onChallengeChange,
  activePrompt,
  isVariation,
}: {
  exercise: Exercise;
  onStart: () => void;
  error: string | null;
  speechSupported: boolean;
  challenge: Dimension | null;
  onChallengeChange: (dim: Dimension) => void;
  activePrompt: string | undefined;
  isVariation: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto">
        <div>
          <span className="inline-block rounded-full bg-spotlight/15 px-2.5 py-0.5 text-xs font-semibold text-spotlight">
            {exercise.scenario}
          </span>
          <p className="mt-2 text-sm text-white/50">
            {exercise.type === 'read' ? 'Read aloud' : exercise.type === 'story' ? 'Walk it through' : 'Speak to the prompt'} · ~
            {exercise.targetSeconds}s
          </p>
          <h1 className="mt-1 text-3xl font-bold">{exercise.title}</h1>
          <p className="mt-1 text-white/60">{exercise.summary}</p>
        </div>

        {/* Today's focus challenge chip */}
        {exercise.focus.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Today&apos;s focus — pick one</p>
            <div className="flex flex-wrap gap-2">
              {exercise.focus.map((dim) => {
                const isSelected = challenge === dim;
                return (
                  <button
                    key={dim}
                    onClick={() => onChallengeChange(dim)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      isSelected
                        ? 'border-spotlight/50 bg-spotlight text-ink'
                        : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-spotlight/30 hover:text-white/80'
                    )}
                  >
                    {BENCHMARKS[dim]?.label ?? dim}
                  </button>
                );
              })}
            </div>
            {challenge && (
              <p className="mt-2 text-xs text-spotlight/80">
                Today&apos;s focus: {BENCHMARKS[challenge]?.label ?? challenge}
              </p>
            )}
          </div>
        )}

        {/* Prompt (with variation tag if applicable) */}
        {activePrompt && (
          <div className="rounded-2xl border border-spotlight/30 bg-spotlight/[0.07] p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">Your prompt</p>
              {isVariation && (
                <span className="rounded-full border border-spotlight/30 px-2 py-0.5 text-[10px] font-semibold text-spotlight/70">
                  Variation
                </span>
              )}
            </div>
            <p className="mt-1.5 text-lg leading-snug">{activePrompt}</p>
          </div>
        )}

        {/* Reading text (unchanged) */}
        {exercise.readingText && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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

        <div className="rounded-2xl bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-spotlight/80">Coach tips</p>
          <ul className="mt-1.5 space-y-1">
            {exercise.tips.map((tip) => (
              <li key={tip} className="text-sm text-white/60">
                • {tip}
              </li>
            ))}
          </ul>
        </div>

        {!speechSupported && (
          <p className="rounded-xl bg-white/[0.04] p-3 text-xs text-white/45">
            Heads up: live transcription isn&apos;t available in this browser (try Chrome). Your delivery — pace,
            pauses, intonation, energy — is still measured from the audio, and you can type what you said afterwards
            for structure &amp; content feedback.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-tier-red">{error}</p>}

      <Button onClick={onStart} size="lg" className="mt-4 h-14 w-full rounded-2xl bg-spotlight text-ink hover:bg-spotlight-soft text-base">
        Start recording
      </Button>
    </div>
  );
}

// ───────────────────────────── Recording ─────────────────────────────

function RecordingView({
  exercise,
  seconds,
  level,
  targetPct,
  reachedTarget,
  targetSeconds,
  onStop,
  activePrompt,
  isVariation,
}: {
  exercise: Exercise;
  seconds: number;
  level: number;
  targetPct: number;
  reachedTarget: boolean;
  targetSeconds: number;
  onStop: () => void;
  activePrompt: string | undefined;
  isVariation: boolean;
}) {
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const ringColor = reachedTarget ? '#3DD68C' : '#FFC857';
  return (
    <div className="flex flex-1 flex-col">
      {/* Compact timer + live level meter */}
      <div className="flex shrink-0 flex-col items-center">
        <Ring value={targetPct} size={132} stroke={10} color={ringColor}>
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
                className={cn('w-2 rounded-full transition-all', active ? 'bg-spotlight' : 'bg-white/10')}
                style={{ height: `${10 + (active ? level * 28 : 4)}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Keep the task in view while recording (essential for read-aloud drills). */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {exercise.readingText && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Read this aloud</p>
            <p className="mt-1.5 text-lg leading-relaxed">{exercise.readingText}</p>
          </div>
        )}
        {activePrompt && (
          <div className="rounded-2xl border border-spotlight/30 bg-spotlight/[0.07] p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">Your prompt</p>
              {isVariation && (
                <span className="rounded-full border border-spotlight/30 px-2 py-0.5 text-[10px] font-semibold text-spotlight/70">
                  Variation
                </span>
              )}
            </div>
            <p className="mt-1.5 text-base leading-snug">{activePrompt}</p>
          </div>
        )}
      </div>

      <p className="mt-3 shrink-0 text-center text-[11px] text-white/35">
        Recording — we&apos;ll transcribe &amp; score this automatically when you stop.
      </p>

      <Button
        onClick={onStop}
        size="lg"
        className="mt-3 h-14 w-full shrink-0 rounded-2xl bg-tier-red text-base hover:opacity-90"
      >
        Stop &amp; get feedback
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
  postRecordProgress,
  exercise,
  celebrationShow,
  onCelebrationDone,
  currentAchievement,
  onAchievementDone,
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
  postRecordProgress: Progress | null;
  exercise: Exercise;
  celebrationShow: boolean;
  onCelebrationDone: () => void;
  currentAchievement: Achievement | null;
  onAchievementDone: () => void;
}) {
  // Score ring color by tier.
  const scoreColor =
    result.overallScore >= 80 ? '#3DD68C' : result.overallScore >= 60 ? '#FFC857' : '#FFB454';
  const headline =
    result.overallScore >= 85
      ? 'Outstanding!'
      : result.overallScore >= 70
      ? 'Great take!'
      : result.overallScore >= 50
      ? 'Solid effort'
      : 'Good start — keep going';

  return (
    <>
      {/* Celebration overlay (fixed, outside the scroll container) */}
      <Celebration show={celebrationShow} onDone={onCelebrationDone} />

      {/* Achievement toast (fixed, outside scroll) */}
      <AchievementToast achievement={currentAchievement} onDone={onAchievementDone} />

      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto pb-2">
          {/* Score + XP */}
          <div className="flex flex-col items-center pt-2">
            <Ring
              value={result.overallScore}
              size={150}
              stroke={12}
              color={scoreColor}
              animate
              displayValue={result.overallScore}
              countUp
            >
              <span className="text-xs text-white/45">score</span>
            </Ring>
            <p className="mt-3 text-xl font-bold">{headline}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-spotlight/15 px-3 py-1 text-sm font-semibold text-spotlight">
                +{result.xpEarned} XP
              </span>
              {reward?.streakIncreased && (
                <span className="rounded-full bg-tier-amber/15 px-3 py-1 text-sm font-semibold text-tier-amber">
                  {reward.streak} day streak
                </span>
              )}
              {reward?.goalReached && (
                <span className="rounded-full bg-stage/15 px-3 py-1 text-sm font-semibold text-stage">
                  Goal hit!
                </span>
              )}
            </div>
          </div>

          {/* ONE THING hero card — most prominent, gold-accented */}
          {result.primaryCue && (
            <div className="rounded-2xl border border-spotlight/40 bg-spotlight/[0.08] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">
                Your one thing for the next rep
              </p>
              <p className="mt-2 text-base font-semibold leading-snug text-white">
                {result.primaryCue}
              </p>
            </div>
          )}

          {/* Self-review playback + delivery timeline */}
          {audioUrl && (
            <DeliveryTimeline audioUrl={audioUrl} durationSec={metrics.durationSec} events={metrics.events} />
          )}

          {/* No-transcript fallback: make the type-to-score path obvious */}
          {result.wordCount === 0 && !metrics.unavailable && (
            <div className="rounded-2xl border border-tier-amber/30 bg-tier-amber/10 p-4">
              <p className="text-sm text-white/90">
                We couldn&apos;t transcribe your words on this device. Type what you said in the box below and tap
                Re-score to grade your Opening, Clarity &amp; Structure.
              </p>
              {transcriptionDiag && (
                <p className="mt-1.5 text-xs text-white/55">Why: {transcriptionDiag}.</p>
              )}
            </div>
          )}

          {/* Dimension breakdown */}
          <div className="space-y-2.5">
            {result.scores.map((s) => {
              const trend = postRecordProgress
                ? dimensionTrend(postRecordProgress, s.dimension)
                : [];
              const hasTrend = trend.length >= 2;
              const barColor =
                s.tier === 'green'
                  ? '#3DD68C'
                  : s.tier === 'amber'
                  ? '#FFB454'
                  : '#FF6B6B';
              const benchmark = BENCHMARKS[s.dimension as keyof typeof BENCHMARKS];
              return (
                <div key={s.dimension} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{s.label}</span>
                      {s.tier && <TierBadge tier={s.tier} />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasTrend && (
                        <Sparkline
                          values={trend}
                          width={56}
                          height={20}
                          color={barColor}
                        />
                      )}
                      <span className={cn('text-sm font-bold', !s.measured && 'text-white/30')}>
                        {s.measured ? s.score : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.measured ? s.score : 0}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-white/55">{s.detail}</p>
                  {benchmark && s.measured && (
                    <p className="mt-1 text-[11px] text-white/30">
                      Target: {benchmark.target} — {benchmark.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Strengths / improvements */}
          {result.strengths.length > 0 && (
            <Bullets title="What worked" color="text-stage" items={result.strengths} />
          )}
          {result.improvements.length > 0 && (
            <Bullets title="Focus areas" color="text-tier-amber" items={result.improvements} />
          )}

          {/* Quick audio stats */}
          {!metrics.unavailable && (
            <div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Speaking" value={`${Math.round(metrics.speakingSec)}s`} />
                <Stat label="Pace" value={`${metrics.articulationWpm ?? metrics.estimatedWpm ?? '—'}`} sub="wpm" />
                <Stat label="Pauses" value={`${metrics.pauseCount}`} />
                <Stat label="Fillers" value={`${result.fillerCount}`} />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/35">
                Analysed from your audio on-device — tone, pace, pauses, volume &amp; fillers.
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
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/80 placeholder:text-white/25"
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
          <Button onClick={onDone} className="h-12 flex-1 rounded-2xl bg-spotlight text-ink hover:bg-spotlight-soft">
            Done
          </Button>
        </div>
      </div>
    </>
  );
}

function Bullets({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] py-3">
      <p className="text-lg font-bold">
        {value}
        {sub && <span className="text-xs font-normal text-white/40"> {sub}</span>}
      </p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  );
}
