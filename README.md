# SmartSpeak

SmartSpeak is a **pocket presentation coach for work** — short, daily, gamified reps that rehearse the meetings that move your career: reading out findings, walking a deck, pitching a strategy, defending an implementation plan, giving a status update, and handling tough questions. It trains three skills:

- **🎙️ Delivery** — the technical craft: pace, deliberate pauses before your key numbers, vocal emphasis, energy, and killing filler words.
- **🧩 Structure** — leading with the point (BLUF), turning data into a clear "so what", walking a deck as one connected story, and making one idea land.
- **🤝 Influence & Q&A** — the 60-second executive summary, a confident ask, and staying composed and answer-first when your plan gets challenged.

It is a mobile-first, installable **PWA** at `/train`: a path of ~1-minute, work-scenario exercises with streaks, XP and a daily goal. It runs **fully in the browser with zero backend**. Recordings are analysed on-device with the Web Audio API (real pace, pause/silence detection, energy dynamics and pitch/intonation tracking), transcription runs on-device (Whisper via Transformers.js + WebAssembly), coaching is computed locally, and progress is saved to `localStorage`. **Your voice never leaves the device.**

## Quick start (no backend, no keys)

```
pnpm install
pnpm dev
```

Open http://localhost:3000/train in Chrome and start a session. No environment variables are required. Allow microphone access when prompted.

> Delivery metrics (pace, pauses, intonation, energy) are measured from your audio in any modern browser. Transcripts power the structure & content scores: SmartSpeak transcribes the **recording on-device** with Whisper after each take (the recorder and a live recognizer can't share the mic on Android, so post-take transcription is the reliable path). The quantized `whisper-tiny.en` model is **self-hosted** in `public/models/` and served from our own origin — it downloads once, is cached on-device, and the audio never leaves the device. You can always edit the transcript to re-score.

## Android & the Play Store (TWA)

The trainer is a standalone, installable PWA, which is the recommended on-ramp to the Google Play Store via a **Trusted Web Activity (TWA)** — no rewrite, no React Native. Full steps are in [`RELEASE.md`](./RELEASE.md).

- **Manifest** (`app/manifest.ts`) is Play-ready: `standalone` display, portrait orientation, `productivity`/`education`/`business` categories, app shortcuts, and PNG icons at 192/512 (the 512 also serves the **maskable** purpose for Android adaptive icons).
- **Package it:** deploy over HTTPS, then run [PWABuilder](https://www.pwabuilder.com/) (or [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)) against the deployed URL to emit a signed Android App Bundle (`.aab`).
- **Verify ownership:** add the generated `assetlinks.json` to `/.well-known/` so the TWA opens without a browser URL bar.
- **Monetisation:** a single one-time **$10 "Pro" in-app product** via Google Play Billing (Digital Goods API works inside a TWA). Free preview = the first 3 exercises; gating lives in `lib/entitlement.ts`.

## Project structure
- `app/train/` the PWA trainer (home path, exercise player, progress, profile, unlock)
- `app/` landing page, manifest, icons, privacy & terms
- `components/train/` trainer UI (tab bar, score rings, level bar, achievements, etc.)
- `components/ui/` shadcn-inspired UI primitives
- `components/brand/logo.tsx` the in-app brand mark (matches the installed app icon)
- `lib/exercises.ts` the exercise curriculum (Delivery, Structure, Influence & Q&A paths)
- `lib/audio-analysis.ts` on-device Web Audio analysis (pace, pauses, energy, pitch)
- `lib/transcribe.ts` / `lib/transcribe.worker.ts` on-device Whisper transcription (self-hosted model)
- `lib/speech-recognition.ts` browser Speech Recognition wrapper
- `lib/coach.ts` deterministic, on-device delivery + structure/content scoring
- `lib/local-store.ts` zero-backend progress/streak/XP store (`localStorage`)
- `lib/entitlement.ts` free-preview gating + Play Billing (Digital Goods) unlock
- `public/models/` self-hosted quantized `whisper-tiny.en` weights

## Testing
- Run `pnpm lint` to lint the codebase.
- Use `pnpm dev` for local validation and manual end-to-end checks.
