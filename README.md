# SmartSpeak Coach

SmartSpeak is a Next.js web application that helps speakers rehearse smarter by analyzing recorded speeches for pace, filler words, clarity, and delivery patterns. The app includes an end-to-end workflow from upload to AI-driven feedback with a dashboard for tracking progress.

## Features

- 🌐 Next.js App Router frontend with Tailwind CSS and shadcn/ui components
- 🔐 Simple email/password authentication with HTTP-only JWT cookie
- 📼 Upload (or record) speech files up to 200MB with client-side progress feedback
- 🧠 Mockable analysis pipeline that stores transcripts, metrics, and personalized tips
- 📊 Progress dashboard visualizing trends in pace, fillers, pauses, and clarity
- 🔁 Shareable read-only report links for each recording
- 🧪 Jest unit tests for tip rules and Playwright smoke test
- 🗃️ PostgreSQL database managed with Prisma ORM

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- `ffmpeg` (required when replacing the mocked analysis pipeline)

### Installation

```bash
pnpm install # or npm install / yarn install
```

### Environment variables

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: secret for signing auth tokens
- `UPLOAD_DIR`: directory for storing uploaded media (default `./uploads`)
- `NEXT_PUBLIC_BASE_URL`: external URL for generating share links

### Database setup

```bash
npx prisma migrate dev
npm run seed
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the seeded account:

- Email: `demo@smartspeak.app`
- Password: `password123`

### Testing

```bash
npm run test       # Jest unit tests
npm run test:e2e   # Playwright smoke test (requires dev server)
```

### Project structure

```
app/               # App Router routes and API endpoints
components/        # UI primitives and feature components
prisma/            # Prisma schema and seed script
src/features/      # Domain logic (auth, tips, analysis)
src/services/      # Infrastructure services (storage, analysis)
src/server/        # Server utilities (Prisma client, auth helpers)
```

### Analysis pipeline

The current implementation provides a deterministic mock for the analysis service so the UI works immediately. To integrate real analysis:

1. Replace `analyzeRecording` in `src/services/analysis.ts` with calls to ffmpeg, Whisper, and your audio feature extraction stack.
2. Populate metrics and transcript with real outputs.
3. Extend `generateTips` if you add new metrics.

### Husky (optional)

Run `npm run prepare` to install Husky hooks once dependencies are installed. You can then add lint/test commands as desired.

### Storage abstraction

Uploaded files are saved locally to `UPLOAD_DIR` via `LocalStorageService`. Swap this implementation with an S3-compatible adapter for production use while keeping the service interface unchanged.

## Roadmap

- In-browser video recorder using the MediaRecorder API
- Segment-level feedback with timeline annotations
- Whisper integration for multilingual transcripts
- Automated OG images for shareable summaries
