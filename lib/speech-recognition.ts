'use client';

/**
 * Thin wrapper around the browser SpeechRecognition API.
 *
 * This gives us live, zero-backend transcription (no Whisper / API key needed)
 * in browsers that support it — primarily Chrome and Edge. When it is not
 * available the trainer falls back to letting the speaker type/paste their
 * words, and the audio-based delivery metrics still work fully.
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
}

export function createTranscriber(options: TranscriberOptions): LiveTranscriber | null {
  if (!isSpeechRecognitionSupported()) return null;

  const Recognition: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = options.lang || 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = '';
  let stopped = false;

  recognition.onresult = (event: any) => {
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
    // "no-speech" / "aborted" are normal lifecycle events, not failures.
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    options.onError?.(event.error || 'speech recognition error');
  };

  // Chrome ends recognition periodically; restart until we explicitly stop.
  recognition.onend = () => {
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
