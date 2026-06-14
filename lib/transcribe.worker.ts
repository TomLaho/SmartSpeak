/**
 * On-device speech-to-text worker (Transformers.js / Whisper tiny.en).
 *
 * Transcribes the *recorded* clip after the take ends, so it never competes
 * with the recorder for the microphone (the Android limitation that breaks live
 * Web Speech). The model downloads once from the HF CDN and is cached by the
 * browser; the audio itself never leaves the device. The pipeline is kept warm
 * in this worker so later takes in a session transcribe immediately.
 */
import { pipeline, env, type Pipeline } from '@xenova/transformers';

// Self-hosted model: weights are served from our own origin (public/models/...)
// so first-time transcription never depends on the HF CDN. Single-threaded WASM
// so we don't require cross-origin isolation (COOP/COEP) headers to run.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models/';
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;

const MODEL = 'Xenova/whisper-tiny.en';

let asrPromise: Promise<Pipeline> | null = null;
function getASR(onProgress: (p: any) => void): Promise<Pipeline> {
  if (!asrPromise) {
    asrPromise = pipeline('automatic-speech-recognition', MODEL, {
      quantized: true,
      progress_callback: onProgress,
    }) as unknown as Promise<Pipeline>;
  }
  return asrPromise;
}

const ctx: any = self;

ctx.onmessage = async (e: MessageEvent) => {
  const { pcm } = (e.data ?? {}) as { pcm: ArrayBuffer };
  try {
    const asr = await getASR((p) => ctx.postMessage({ type: 'progress', data: p }));
    ctx.postMessage({ type: 'status', stage: 'transcribing' });
    const audio = new Float32Array(pcm);
    const out: any = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
    const text = (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out?.text ?? '').trim();
    ctx.postMessage({ type: 'result', text });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: String(err?.message ?? err) });
  }
};

export {};
