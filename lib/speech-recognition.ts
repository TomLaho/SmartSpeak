'use client';

/**
 * Thin wrapper around the browser SpeechRecognition API.
 *
 * This gives us live, zero-backend transcription (no Whisper / API key needed)
 * in browsers that support it — primarily desktop Chrome and Edge. On Android
 * it is unreliable: the OS often won't let the speech recognizer share the
 * microphone with an active MediaRecorder, so the trainer always falls back to
 * letting the speaker type/paste their words, and the audio-based delivery
 * metrics still work fully.
 *
 * `onStatus` reports lifecycle events so the UI can explain *why* a transcript
 * came back empty (mic busy vs. service error vs. no words).
 */

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export interface LiveTranscriber {
  start: () => void;
  stop: () => void;
}

interface TranscriberOptions {
  lang?: string;
  /** Called with the full running transcript (final + interim) on each update. */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  /** Lifecycle: 'start' | 'audiostart' | 'speechstart' | 'result' | 'end' | `error:<code>`. */
  onStatus?: (status: string) => void;
}

export function createTranscriber(options: TranscriberOptions): LiveTranscriber | null {
  if (!isSpeechRecognitionSupported()) return null;

  const Recognition: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = options.lang || 'en-US';
  // Android Chrome handles non-continuous recognition far more reliably; we
  // recreate "continuous" behaviour by restarting in onend until we stop.
  recognition.continuous = false;
  recognition.interimResults = true;

  let finalTranscript = '';
  let stopped = false;

  recognition.onstart = () => options.onStatus?.('start');
  recognition.onaudiostart = () => options.onStatus?.('audiostart');
  recognition.onspeechstart = () => options.onStatus?.('speechstart');

  recognition.onresult = (event: any) => {
    options.onStatus?.('result');
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += chunk + ' ';
      } else {
        interim += chunk;
      }
    }
    const combined = (finalTranscript + interim).replace(/\s+/g, ' ').trim();
    options.onTranscript(combined, false);
  };

  recognition.onerror = (event: any) => {
    const code = event.error || 'error';
    options.onStatus?.(`error:${code}`);
    // "no-speech" / "aborted" are normal lifecycle events, not hard failures.
    if (code === 'no-speech' || code === 'aborted') return;
    options.onError?.(code);
  };

  // Chrome ends recognition after each phrase / periodically; restart until we
  // explicitly stop, so a whole take is captured.
  recognition.onend = () => {
    options.onStatus?.('end');
    if (!stopped) {
      try {
        recognition.start();
      } catch {
        /* already starting */
      }
    } else {
      options.onTranscript(finalTranscript.replace(/\s+/g, ' ').trim(), true);
    }
  };

  return {
    start: () => {
      stopped = false;
      finalTranscript = '';
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    },
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
