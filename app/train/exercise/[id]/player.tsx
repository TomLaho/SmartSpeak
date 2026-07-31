'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import {
  EXERCISES,
  getExercise,
  pickVariation,
  BENCHMARKS,
  countWords,
  expectedSeconds,
} from '@/lib/exercises';
import { analyzeAudioInWorker, type AudioMetrics } from '@/lib/audio-analysis';
import { coachAttempt, paceWpm, type CoachResult } from '@/lib/coach';
import { loadCalibration, toCalibrationInput } from '@/lib/calibration';
import {
  transcribeOnDevice,
  isOnDeviceTranscriptionSupported,
  warmUpTranscriber,
  type TranscribeProgress,
} from '@/lib/transcribe';
import {
  isProCached,
  refreshEntitlement,
  canAccessExercise,
  canAccessFreePlay,
  FREE_EXERCISE_LIMIT,
  PRO_PRICE,
} from '@/lib/entitlement';
import { FREE_PLAY_ID } from '@/lib/exercises';
import {
  dayKey,
  loadProgress,
  recordAttempt,
  dimensionTrend,
  lastDimensionScores,
  loadLastChallenge,
  saveLastChallenge,
  type Progress,
} from '@/lib/local-store';
import { evaluateAchievements, ACHIEVEMENTS, type Achievement } from '@/lib/achievements';
// lib/speech-recognition is no longer imported: on-device Whisper (transcribeOnDevice)
// is now the sole transcription path so audio never leaves the device.
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
  // True only before the very first take on this device, when the one-time
  // ~55 MB speech-model download still has to happen. Warn on the intro screen
  // so a tester on mobile data expects the wait instead of reading it as a hang.
  const [warnFirstDownload, setWarnFirstDownload] = useState(false);

  // Celebration + achievement queue state.
  const [celebrationShow, setCelebrationShow] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Progress snapshot captured after recordAttempt for sparklines.
  const [postRecordProgress, setPostRecordProgress] = useState<Progress | null>(null);

  // Free-preview status for the results screen (null = Pro user or free-play rep).
  // justUsedLast marks the take that consumed the final free slot — the one
  // moment the results screen makes the Pro offer prominently.
  const [freePreview, setFreePreview] = useState<{ left: number; justUsedLast: boolean } | null>(null);

  // Recording infra refs.
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors `audioUrl` so the object URL can be revoked from cleanup paths that
  // don't re-run on every render (unmount, retry).
  const audioUrlRef = useRef<string | null>(null);
  // True once the user has deliberately ended a take by tapping Stop. From that
  // moment the recording is theirs and must still be scored, so teardown leaves
  // the recorder's handlers alone — `stop()` fires its event as a queued task,
  // and detaching in the gap would drop a finished take with no error shown.
  const takeCommittedRef = useRef(false);
  // Set on teardown so a committed take's queued `stop` handler still scores
  // the rep but skips the UI-only work whose cleanup is already gone.
  const unmountedRef = useRef(false);
  // Screen wake lock, held for the duration of a take only. Android's screen
  // timeout is commonly 30s while takes run 45–90s, and speaking to the phone
  // without touching it never resets that timer — a screen-off mid-take can
  // truncate the capture and score a rep the user never finished saying.
  // Strictly best-effort: the API is absent on older WebViews and a refused
  // request must never stop a recording from starting.
  const wakeLockRef = useRef<any>(null);
  // Whether a lock is currently wanted. `request()` resolves asynchronously, so
  // a take that ends first must not leave a lock pinned on the results screen.
  const wantWakeLockRef = useRef(false);

  /**
   * Point the results player at a take's audio, releasing the previous one.
   *
   * Object URLs pin the whole recording in memory until they're revoked or the
   * document unloads — and a TWA document lives for the entire session, so a
   * take-per-rep leak adds up fast on a phone.
   */
  const setTakeAudio = useCallback((url: string | null) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = url;
    setAudioUrl(url);
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
    const progress = loadProgress();
    setAttemptCount(progress.exercises[exercise.id]?.attempts ?? 0);
    // No take anywhere yet ⇒ the model has never been fetched, so this rep pays
    // the download. Any later rep finds it cached and needs no warning.
    const anyTakeYet = Object.values(progress.exercises).some((e) => e.attempts > 0);
    setWarnFirstDownload(!anyTakeYet && isOnDeviceTranscriptionSupported());
  }, [exercise]);

  // Advance achievement queue → currentAchievement one at a time.
  useEffect(() => {
    if (currentAchievement === null && achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      setCurrentAchievement(next);
      setAchievementQueue(rest);
    }
  }, [currentAchievement, achievementQueue]);

  const releaseWakeLock = useCallback(() => {
    wantWakeLockRef.current = false;
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    lock?.release?.().catch(() => {});
  }, []);

  const cleanup = useCallback(() => {
    releaseWakeLock();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    // Detach the recorder's handlers BEFORE the tracks stop — but only for a
    // take the user never committed. Ending every track makes the stream
    // inactive, which stops the recorder and fires `stop`, so leaving onstop
    // attached would score and record a take they abandoned (closing
    // mid-recording, or navigating away), burning one of their free preview
    // slots for a rep they never finished. Once Stop has been tapped the
    // opposite is true: the queued `stop` event must still run or the finished
    // take disappears.
    const recorder = recorderRef.current;
    if (recorder && !takeCommittedRef.current) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorderRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    rafRef.current = null;
    timerRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, [releaseWakeLock]);

  useEffect(
    () => () => {
      unmountedRef.current = true;
      cleanup();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    },
    [cleanup]
  );

  // Gate deep links: free users get FREE_EXERCISE_LIMIT distinct exercises.
  // Free-play has its own separate gate (1 free use; never burns a preview slot).
  useEffect(() => {
    if (!exercise) return;
    const progress = loadProgress();

    if (exercise.id === FREE_PLAY_ID) {
      const freePlayAttempts = progress.exercises[FREE_PLAY_ID]?.attempts ?? 0;
      const lastFreePlayDate = progress.exercises[FREE_PLAY_ID]?.lastDate ?? null;
      if (canAccessFreePlay({ pro: isProCached(), freePlayAttempts, lastFreePlayDate })) return;
      refreshEntitlement().then((pro) => {
        if (!canAccessFreePlay({ pro, freePlayAttempts, lastFreePlayDate })) router.replace('/train/unlock');
      });
      return;
    }

    const alreadyAttempted = (progress.exercises[exercise.id]?.attempts ?? 0) > 0;
    // Exclude FREE_PLAY_ID so a free-play rep never burns a preview slot.
    const distinctAttempted = Object.entries(progress.exercises).filter(
      ([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID
    ).length;
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
      let text = '';
      let transcriptionError: string | null = null;

      // On-device Whisper is the sole transcription path on all platforms —
      // audio never leaves the device.
      if (isOnDeviceTranscriptionSupported()) {
        try {
          setTranscribeStatus({ stage: 'loading' });
          text = (await transcribeOnDevice(blob, (p) => setTranscribeStatus(p))).trim();
          if (text) setTranscript(text);
        } catch (err: any) {
          transcriptionError = `on-device transcription: ${err?.message ?? 'failed'}`;
        } finally {
          setTranscribeStatus(null);
        }
      }

      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : undefined;
      if (!wordCount) {
        setTranscriptionDiag(
          transcriptionError
            ? `transcription error: ${transcriptionError}`
            : !isOnDeviceTranscriptionSupported()
            ? 'this browser cannot run on-device transcription'
            : 'we could not make out any speech in the recording'
        );
      } else {
        setTranscriptionDiag(null);
      }

      try {
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

        // Free-preview status: count distinct curriculum exercises attempted
        // (free-play never burns a slot) before and after this take, so the
        // "last free rep" moment fires exactly once — never on replays.
        if (!isProCached() && exercise.id !== FREE_PLAY_ID) {
          const distinctOf = (p: Progress) =>
            Object.entries(p.exercises).filter(([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID).length;
          const before = distinctOf(progressBeforeAttempt);
          const after = distinctOf(saved.progress);
          setFreePreview({
            left: Math.max(0, FREE_EXERCISE_LIMIT - after),
            justUsedLast: before < FREE_EXERCISE_LIMIT && after >= FREE_EXERCISE_LIMIT,
          });
          // Self-heal a stale cache (e.g. reinstall before Play restore ran):
          // never show the upsell to someone who already owns Pro.
          refreshEntitlement().then((pro) => pro && setFreePreview(null));
        } else {
          setFreePreview(null);
        }

        setReward({
          streakIncreased: saved.streakIncreased,
          goalReached: saved.goalReached,
          streak: saved.progress.streak,
        });

        // Evaluate achievements. graceUsedDay is written with the local dayKey,
        // so compare local-to-local (a UTC slice misses mornings in UTC+ zones).
        const graceUsedThisSession = saved.progress.graceUsedDay === dayKey();
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
      } catch (err: any) {
        console.error(err);
        setTranscribeStatus(null);
        setError('Something went wrong analysing that take — sorry. Please try again.');
        setPhase('intro');
      }
    },
    [exercise]
  );

  const startRecording = useCallback(async () => {
    warmUpTranscriber();
    takeCommittedRef.current = false;
    setError(null);
    setTranscript('');
    setSeconds(0);
    chunksRef.current = [];

    // Pick the first MIME type the browser supports for best cross-platform compat.
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(
      (t) => (MediaRecorder as any).isTypeSupported?.(t)
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Recorder — use negotiated mimeType so Safari/iOS and some Android WebViews
      // can decode the blob in decodeAudioData.
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blobType = mimeType || recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        // Skip the object URL when the screen is already gone: nothing will
        // render it, and no cleanup path is left to revoke it.
        if (!unmountedRef.current) setTakeAudio(URL.createObjectURL(blob));
        void finishAnalysis(blob);
      };
      recorder.onerror = () => {
        cleanup();
        setLevel(0);
        setError('Recording failed — your microphone may have been interrupted. Please try again.');
        setPhase('intro');
      };
      recorder.start();

      // Live level meter
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new Ctx();
      // iOS suspends AudioContext until resumed inside a user-gesture handler.
      if (audioCtx.state === 'suspended') audioCtx.resume();
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

      // Keep the screen on for the take. Never awaited and never allowed to
      // throw — if the lock resolves after the take already ended, drop it.
      wantWakeLockRef.current = true;
      (navigator as any).wakeLock
        ?.request?.('screen')
        .then((lock: any) => {
          if (!wantWakeLockRef.current) lock?.release?.().catch(() => {});
          else wakeLockRef.current = lock;
        })
        .catch(() => {});
    } catch (err: any) {
      console.error(err);
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError(
          "Microphone access is blocked. Enable it in your phone's Settings → Apps → SmartSpeak → Permissions → Microphone, then try again."
        );
      } else if (name === 'NotFoundError') {
        setError('No microphone was found on this device.');
      } else if (name === 'NotReadableError') {
        setError('Your microphone is in use by another app. Close it and try again.');
      } else {
        setError('Microphone access is required. Please allow it and try again.');
      }
    }
  }, [cleanup, finishAnalysis, setTakeAudio]);

  const stopRecording = useCallback(() => {
    // From here the take belongs to the user — see takeCommittedRef.
    takeCommittedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setLevel(0);
    releaseWakeLock();
    recorderRef.current?.stop(); // triggers onstop → finishAnalysis
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, [releaseWakeLock]);

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
    setTakeAudio(null);
    setTranscript('');
    setTranscriptionDiag(null);
    setTranscribeStatus(null);
    setCelebrationShow(false);
    setAchievementQueue([]);
    setCurrentAchievement(null);
    setPostRecordProgress(null);
    setFreePreview(null);
    // Re-read the attempt count so pickVariation advances to the next
    // variation (the mount-time value goes stale after a recorded take).
    if (exercise) setAttemptCount(loadProgress().exercises[exercise.id]?.attempts ?? 0);
    setPhase('intro');
  }, [cleanup, exercise, setTakeAudio]);

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

  // Derived, not the authored targetSeconds — see `expectedSeconds`.
  const target = expectedSeconds(exercise);
  const targetPct = Math.min(100, (seconds / target) * 100);
  const reachedTarget = seconds >= target;

  // The variation-picked prompt string (for topic/story exercises).
  const activePrompt = exercise.readingText
    ? undefined
    : pickVariation(exercise, attemptCount);
  const isVariation = activePrompt !== undefined && activePrompt !== exercise.prompt;

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/train"
          className="flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          onClick={cleanup}
        >
          <XMarkIcon className="h-4 w-4" />
          Close
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
          challenge={challenge}
          onChallengeChange={(dim) => {
            setChallenge(dim);
            saveLastChallenge(dim);
          }}
          activePrompt={activePrompt}
          isVariation={isVariation}
          warnFirstDownload={warnFirstDownload}
        />
      )}

      {phase === 'recording' && (
        <RecordingView
          exercise={exercise}
          seconds={seconds}
          level={level}
          targetPct={targetPct}
          reachedTarget={reachedTarget}
          targetSeconds={target}
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
          editable={transcript.trim().length > 0}
          postRecordProgress={postRecordProgress}
          exercise={exercise}
          celebrationShow={celebrationShow}
          onCelebrationDone={() => setCelebrationShow(false)}
          currentAchievement={currentAchievement}
          onAchievementDone={() => setCurrentAchievement(null)}
          freePreview={freePreview}
        />
      )}
    </div>
  );
}

/**
 * A passage laid out for reading aloud from a phone at arm's length.
 *
 * Split one sentence per line with generous leading and spacing between them:
 * a solid block of justified text is easy to lose your place in mid-take, and
 * the line breaks double as natural breath points for the read.
 */
function ReadingPassage({ text }: { text: string }) {
  const lines = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mt-3 space-y-3">
      {lines.map((line, i) => (
        <p key={i} className="text-lg leading-loose text-white/95">
          {/* Bracketed cues like "[pause]" are directions, not words to read —
              set them apart so they aren't read aloud by mistake. */}
          {line.split(/(\[[^\]]*\])/g).map((part, j) =>
            part.startsWith('[') && part.endsWith(']') ? (
              <span key={j} className="text-sm font-semibold uppercase tracking-wide text-spotlight/70">
                {' '}
                {part.slice(1, -1)}{' '}
              </span>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────── Intro ───────────────────────────────

function IntroView({
  exercise,
  onStart,
  error,
  challenge,
  onChallengeChange,
  activePrompt,
  isVariation,
  warnFirstDownload,
}: {
  exercise: Exercise;
  onStart: () => void;
  error: string | null;
  challenge: Dimension | null;
  onChallengeChange: (dim: Dimension) => void;
  activePrompt: string | undefined;
  isVariation: boolean;
  warnFirstDownload: boolean;
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
            {expectedSeconds(exercise)}s
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

        {/* Reading text */}
        {exercise.readingText && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Read this aloud</p>
              <p className="shrink-0 text-xs text-white/35">
                {countWords(exercise.readingText)} words · ~{expectedSeconds(exercise)}s
              </p>
            </div>
            <ReadingPassage text={exercise.readingText} />
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


      </div>

      {error && <p className="mt-3 text-sm text-tier-red">{error}</p>}

      {warnFirstDownload && (
        <p className="mt-3 text-xs text-white/45">
          Heads up: your first take downloads a one-time ~55 MB speech model so all coaching runs
          privately on your phone. Best done on Wi-Fi — it&apos;s cached for every rep after this.
        </p>
      )}

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
            <ReadingPassage text={exercise.readingText} />
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
  freePreview,
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
  freePreview: { left: number; justUsedLast: boolean } | null;
}) {
  // Timestamp of the last re-score, used purely as an animation key so tapping
  // twice replays the confirmation instead of leaving a stale chip on screen.
  const [rescoredAt, setRescoredAt] = useState(0);

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

          {/* The post-value Pro moment — shown once, on the take that used the
              final free slot. Replays and remaining-rep states get the subtle
              footnote at the bottom of the results instead. */}
          {freePreview?.justUsedLast && (
            <Link
              href="/train/unlock"
              className="block rounded-2xl border border-spotlight/40 bg-gradient-to-br from-spotlight/20 to-spotlight/5 p-4 transition-transform active:scale-[0.99]"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">
                Free preview complete
              </p>
              <p className="mt-1.5 text-base font-semibold leading-snug">
                That was your last free rep — nice work.
              </p>
              <p className="mt-1 text-sm text-white/60">
                Keep the streak going with all {EXERCISES.length} scenarios. {PRO_PRICE} one-time, yours forever.
              </p>
              <span className="mt-3 inline-block rounded-full bg-spotlight px-4 py-2 text-sm font-semibold text-ink">
                See what&apos;s in Pro
              </span>
            </Link>
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
                ? dimensionTrend(postRecordProgress, s.dimension, 7, exercise.id)
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
                <Stat label="Length" value={`${Math.round(metrics.durationSec)}s`} />
                <Stat label="Pace" value={`${paceWpm(metrics) ?? '—'}`} sub="wpm" />
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
            {/* Re-scoring rewrites numbers further up the page, well outside
                the viewport — without an acknowledgement at the point of the
                tap it reads as a dead button. */}
            <div className="mt-2 flex items-center gap-2">
              <Button
                onClick={() => {
                  onRescore();
                  setRescoredAt(Date.now());
                }}
                variant="secondary"
                size="sm"
                className="border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Re-score
              </Button>
              {rescoredAt > 0 && (
                <span
                  key={rescoredAt}
                  role="status"
                  className="flex animate-chip-confirm items-center gap-1 rounded-full bg-stage/15 px-2.5 py-1 text-xs font-semibold text-stage"
                >
                  <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />
                  Scores updated
                </span>
              )}
            </div>
          </div>

          {/* Free-preview footnote (skipped on the take that shows the hero card) */}
          {freePreview && !freePreview.justUsedLast && (
            <Link
              href="/train/unlock"
              className="block pb-1 text-center text-xs text-white/40 transition-colors hover:text-white/60"
            >
              {freePreview.left > 0
                ? `${freePreview.left} free rep${freePreview.left === 1 ? '' : 's'} left · Pro unlocks all ${EXERCISES.length} scenarios`
                : `Free preview used · Pro unlocks all ${EXERCISES.length} scenarios`}
            </Link>
          )}
        </div>

        <div className="mt-3 flex gap-3">
          <Button
            onClick={onRetry}
            variant="secondary"
            className="h-12 flex-1 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
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
