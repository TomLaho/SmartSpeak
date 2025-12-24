# SmartSpeak

SmartSpeak is an AI-powered speech coaching MVP built with Next.js, Clerk, Stripe, Prisma (Postgres), Tailwind, and OpenAI. Users can record or upload practice audio, transcribe with Whisper, compute deterministic speech metrics, and receive structured coaching feedback via GPT-4o-mini. Free users get 3 lifetime sessions; paid users (Stripe subscription) get unlimited sessions.

## Features
- Record or upload 2–5 minute practice sessions with in-browser recording
- Whisper-based transcription (server-side)
- Deterministic speech metrics: WPM, fillers, pauses, structure proxies, SmartSpeak score
- Structured LLM feedback (JSON) with concise strengths, improvements, and quick wins
- Dashboard, Practice flow, History, and Session analysis views
- Paywall enforcement (free: 3 lifetime sessions; pro: unlimited) with Stripe Checkout + webhook handling
- Private audio storage on S3-compatible buckets (Cloudflare R2 recommended) using presigned URLs
- Optional background analysis worker via BullMQ + Redis

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
- `app/` Next.js App Router pages and API routes
- `lib/` shared utilities (db, storage, stripe, openai, metrics)
- `prisma/` schema and seed
- `components/ui/` shadcn-inspired UI primitives
- `worker/` optional BullMQ worker for background analysis

## Testing
- Run `pnpm lint` to lint the codebase.
- Use `pnpm dev` for local validation and manual end-to-end checks.
