'use client';

/**
 * Client side of on-device transcription.
 *
 * Decodes + downsamples the recorded clip to 16 kHz mono on the main thread
 * (decodeAudioData is off-thread), then hands the PCM to a long-lived worker
 * running Whisper. Reports model-download / transcription progress so the UI can
 * explain the one-time setup. Falls back gracefully (caller catches) so the app
 * stays usable if anything fails.
 */

export interface TranscribeProgress {
  stage: 'loading' | 'transcribing';
  /** 0–100 during model download; undefined while transcribing. */
  percent?: number;
}

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url));
  return worker;
}
function resetWorker(): void {
  if (worker) {
    try {
      worker.terminate();
    } catch {
      /* ignore */
    }
    worker = null;
  }
}

/** True when the browser can run the on-device pipeline at all. */
export function isOnDeviceTranscriptionSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
}

async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    ctx.close().catch(() => {});
  }
  const targetRate = 16000;
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, frames, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded; // multi-channel sources downmix to the mono destination
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Transcribe a recorded clip on-device. Resolves with text (may be empty). */
export async function transcribeOnDevice(
  blob: Blob,
  onProgress?: (p: TranscribeProgress) => void
): Promise<string> {
  const pcm = await decodeTo16kMono(blob);
  const w = getWorker();
  return new Promise<string>((resolve, reject) => {
    // Watchdog: if the worker stops sending anything (failed model fetch, stuck
    // WASM, blocked thread) the take must not freeze on "Analysing…". Reset on
    // every message so a slow model download / inference isn't cut short.
    let watchdog: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(watchdog);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };
    const arm = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        cleanup();
        resetWorker(); // recreate a fresh worker next time
        reject(new Error('on-device transcription timed out'));
      }, 90_000);
    };
    const onMessage = (e: MessageEvent) => {
      arm();
      const m = e.data ?? {};
      if (m.type === 'progress') {
        const pct =
          m.data && typeof m.data.progress === 'number' ? Math.round(m.data.progress) : undefined;
        if (m.data?.status === 'progress' || m.data?.status === 'download' || m.data?.status === 'initiate') {
          onProgress?.({ stage: 'loading', percent: pct });
        }
      } else if (m.type === 'status' && m.stage === 'transcribing') {
        onProgress?.({ stage: 'transcribing' });
      } else if (m.type === 'result') {
        cleanup();
        resolve(String(m.text ?? '').trim());
      } else if (m.type === 'error') {
        cleanup();
        resetWorker(); // broken ONNX/OOM state — don't reuse this worker
        reject(new Error(m.message || 'transcription failed'));
      }
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      resetWorker(); // worker script failed to load — don't reuse it
      reject(new Error(e.message || 'transcription worker failed'));
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    arm();
    const copy = pcm.slice();
    w.postMessage({ pcm: copy.buffer }, [copy.buffer]);
  });
}
