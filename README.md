# SmartSpeak

SmartSpeak is a **pocket presentation coach for work** — short, daily, gamified reps that rehearse the meetings that move your career: reading out findings, walking a deck, pitching a strategy, defending an implementation plan, giving a status update, and handling tough questions. It trains three skills:

- **🎙️ Delivery** — the technical craft: pace, deliberate pauses before your key numbers, vocal emphasis, energy, and killing filler words.
- **🧩 Structure** — leading with the point (BLUF), turning data into a clear "so what", walking a deck as one connected story, and making one idea land.
- **🤝 Influence & Q&A** — the 60-second executive summary, a confident ask, and staying composed and answer-first when your plan gets challenged.

There are two surfaces in this repo:

1. **The Trainer (`/train`)** — a mobile-first, installable PWA with a path of ~1-minute, work-scenario exercises, streaks, XP and a daily goal. It runs **fully in the browser with zero backend**: recordings are analysed on-device with the Web Audio API (real pace, pause/silence detection, energy dynamics and pitch/intonation tracking), transcription uses the browser Speech Recognition API, coaching is computed locally, and progress is saved to `localStorage`. Your voice never leaves the device.
2. **The Cloud app (`/app`)** — the original authenticated MVP (Next.js, Clerk, Stripe, Prisma/Postgres, S3, OpenAI Whisper + GPT-4o-mini) for recording/uploading longer sessions with server-side transcription and LLM feedback.

## Quick start — the Trainer (no backend, no keys)

```
pnpm install
pnpm dev
```

Open http://localhost:3000/train in **Chrome** (best Speech Recognition support) and start a session. No environment variables required. Allow microphone access when prompted.

> Delivery metrics (pace, pauses, intonation, energy) work in any modern browser. Live transcription — and therefore structure & content feedback — needs the Web Speech API (Chrome/Edge); in other browsers you can type what you said to get structure & content scores.

## Android & the Play Store (TWA)

The trainer is a standalone, installable PWA, which is the recommended on-ramp to the Google Play Store via a **Trusted Web Activity (TWA)** — no rewrite, no React Native.

- **Manifest** (`app/manifest.ts`) is Play-ready: `standalone` display, portrait orientation, `productivity`/`education`/`business` categories, app shortcuts, and a dedicated **maskable** icon (`public/icon-maskable.svg`) with a safe zone for Android adaptive icons. The standard mark lives at `app/icon.svg` and is re-used in-app via `components/brand/logo.tsx`.
- **Package it:** deploy the app over HTTPS, then run [PWABuilder](https://www.pwabuilder.com/) (or [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)) against the deployed URL. Both read this manifest, **rasterise the SVG icons into the required PNG set (192/512 + maskable)**, and emit a signed Android App Bundle (`.aab`) you can upload to the Play Console.
- **Verify ownership:** add the generated `assetlinks.json` to `/.well-known/` so the TWA opens without a browser URL bar.
- **Monetisation:** for a paid/subscription tier on Android, use Google Play Billing (the Play Billing/Digital Goods API works inside a TWA). The existing Stripe plumbing under `/app` is for the web build.

## Cloud app features
- Record or upload 2–5 minute practice sessions with in-browser recording
- Whisper-based transcription (server-side)
- Deterministic speech metrics: WPM, fillers, pauses, structure proxies, SmartSpeak score
- Structured LLM feedback (JSON) with concise strengths, improvements, and quick wins
- Dashboard, Practice flow, History, and Session analysis views
- Paywall enforcement (free: 3 lifetime sessions; pro: unlimited) with Stripe Checkout + webhook handling
- Private audio storage on S3-compatible buckets (Cloudflare R2 recommended) using presigned URLs
- Optional background analysis worker via BullMQ + Redis

> The cloud app under `/app` requires Clerk to be configured (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`). When Clerk keys are absent the app boots in demo mode and only the `/train` trainer is active.

## Getting Started
### Prerequisites
- Node.js 18+
- pnpm
- Postgres database (Neon/Supabase/local)
- S3-compatible bucket (Cloudflare R2 recommended)
- Stripe account + CLI for local webhooks
- OpenAI API key

### Environment
Copy `.env.example` to `.env` and fill in values:

```
cp .env.example .env
```

Key variables:
- `DATABASE_URL` Postgres connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` Clerk keys
- `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL=whisper-1`, `OPENAI_COACH_MODEL=gpt-4o-mini`
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `APP_URL`
- `REDIS_URL` (optional for BullMQ worker)

### Setup
1) Install deps
```
pnpm install
```

2) Prisma migration + seed
```
pnpm prisma:migrate
pnpm prisma:seed
```

3) Run dev server
```
pnpm dev
```
App runs on http://localhost:3000.

4) Optional worker
```
pnpm worker
```

### Clerk
- Configure an application in Clerk using Email magic links.
- Set authorized redirect to `http://localhost:3000`.

### Stripe
- Create a recurring price and set `STRIPE_PRICE_ID_MONTHLY`.
- Start the dev server, then run the Stripe CLI to forward webhooks:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Storage
- Use Cloudflare R2 or any S3-compatible bucket.
- Ensure the access keys are set and the bucket exists. Files are private and accessed via signed URLs only.

### Notes
- All AI calls occur server-side; API keys are never exposed to the client.
- Free-tier enforcement happens in `/api/transcribe` and `/api/analyze`; exceeding the quota returns HTTP 402.
- Max upload size: 20MB client-side guard; duration validated up to 10 minutes.
- The UI provides clear states for uploading, transcribing, editing, and analyzing.

## Project Structure
- `app/train/` the mobile-first PWA trainer (home path, exercise player, progress, profile)
- `app/app/` the authenticated cloud app (dashboard, practice, history, sessions, billing)
- `app/` shared landing, manifest, icon, and API routes
- `components/train/` trainer UI (tab bar, score rings, etc.)
- `components/ui/` shadcn-inspired UI primitives
- `lib/exercises.ts` the exercise curriculum (Delivery, Structure, Influence & Q&A paths)
- `lib/audio-analysis.ts` on-device Web Audio analysis (pace, pauses, energy, pitch)
- `lib/speech-recognition.ts` browser Speech Recognition wrapper
- `lib/coach.ts` deterministic, on-device delivery + structure/content scoring
- `components/brand/logo.tsx` the in-app brand mark (matches the installed app icon)
- `lib/local-store.ts` zero-backend progress/streak/XP store (`localStorage`)
- `lib/` shared utilities (db, storage, stripe, openai, metrics)
- `prisma/` schema and seed
- `worker/` optional BullMQ worker for background analysis

## Testing
- Run `pnpm lint` to lint the codebase.
- Use `pnpm dev` for local validation and manual end-to-end checks.
